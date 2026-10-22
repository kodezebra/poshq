<script lang="ts">
  import { onMount } from "svelte";
  import { PackageSearch, RefreshCw, SearchX, Wallet } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import CartPanel from "$lib/components/terminal/CartPanel.svelte";
  import TerminalGrid from "$lib/components/terminal/TerminalGrid.svelte";
  import type { Product } from "$lib/db/schema";
  import { createOrder, getCashSummary } from "$lib/db/orders";
  import { listProducts } from "$lib/db/products";
  import { getVatRate } from "$lib/db/settings";
  import type { PaymentMethod } from "$lib/payment";
  import { cart } from "$lib/stores/cart.svelte";
  import { cn, errorMessage, formatUGX } from "$lib/utils";

  const SEARCH_ID = "terminal-search";

  let search = $state("");
  let query = $state("");
  let category = $state<string | null>(null);
  let categories = $state<string[]>([]);
  let products = $state<Product[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let charging = $state(false);
  let till = $state({ inDrawer: 0, sales: 0 });
  let reloadKey = $state(0);

  const focusSearch = () => document.getElementById(SEARCH_ID)?.focus();

  /** What the drawer should hold for the day so far. */
  async function refreshTill() {
    try {
      till = await getCashSummary();
    } catch (cause) {
      console.error("load till", cause);
    }
  }

  onMount(() => {
    focusSearch();

    getVatRate()
      .then((rate) => cart.setVatRate(rate))
      .catch((cause) => console.error("load vat rate", cause));

    void refreshTill();

    listProducts()
      .then((rows) => {
        categories = [...new Set(rows.map((row) => row.category))].sort();
      })
      .catch((cause) => console.error("load categories", cause));
  });

  // Debounce typing so each keystroke doesn't hit SQLite.
  $effect(() => {
    const term = search;
    const timer = setTimeout(() => {
      query = term.trim();
    }, 200);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const term = query;
    const group = category;
    void reloadKey;

    let cancelled = false;
    loading = true;
    error = null;

    listProducts({ search: term, category: group })
      .then((rows) => {
        if (!cancelled) products = rows;
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        error = errorMessage(cause);
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  async function addFromSearch(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const term = search.trim();
    const matches = await listProducts({ search: term, category });
    const exact = matches.find(
      (product) => product.sku?.toLowerCase() === term.toLowerCase(),
    );
    const picked = exact ?? matches[0];

    if (!picked) return;
    cart.add(picked);
    search = "";
    query = "";
    focusSearch();
  }

  async function charge(payment: {
    method: PaymentMethod;
    tendered: number;
  }) {
    if (cart.isEmpty || charging) return;
    charging = true;

    try {
      const order = await createOrder({
        lines: [...cart.lines],
        vatRate: cart.vatRate,
        paymentMethod: payment.method,
        tendered: payment.tendered,
      });

      const paid = order.paymentMethod === "card" ? "Card" : "Cash";
      toast.success(`Order ${order.orderNo} charged`, {
        description:
          order.change > 0
            ? `${paid} ${formatUGX(order.tendered)} · change ${formatUGX(order.change)}`
            : `${paid} ${formatUGX(order.tendered)}`,
      });

      cart.clear();
      search = "";
      query = "";
      focusSearch();
      void refreshTill();
    } catch (cause) {
      toast.error("Could not complete the sale", {
        description: errorMessage(cause),
      });
    } finally {
      charging = false;
    }
  }
</script>

<div
  class="flex min-h-[calc(100dvh-3rem)] flex-col lg:h-[calc(100dvh-3rem)] lg:flex-row"
>
  <section class="flex min-h-0 flex-1 flex-col">
    <header class="flex flex-wrap items-center gap-2 border-b border-hairline bg-canvas px-3 py-2">
      <div class="min-w-40 flex-1 lg:max-w-60">
        <Input
          id={SEARCH_ID}
          bind:value={search}
          onkeydown={addFromSearch}
          placeholder="Scan or search products…"
          aria-label="Scan or search products"
          class="h-9"
        />
      </div>

      {#if categories.length}
        <div
          class="order-last -mx-1 flex w-full items-center gap-1.5 overflow-x-auto px-1 xl:order-none xl:mx-0 xl:w-auto xl:min-w-0 xl:flex-1 xl:px-0"
          role="group"
          aria-label="Category filter"
        >
          <button
            type="button"
            aria-pressed={category === null}
            onclick={() => (category = null)}
            class={cn(
              "h-7 shrink-0 rounded-pill border px-2.5 text-caption transition-colors",
              category === null
                ? "border-primary bg-primary/5 text-primary"
                : "border-hairline text-ink-secondary hover:bg-canvas-soft",
            )}
          >
            All
          </button>
          {#each categories as name (name)}
            <button
              type="button"
              aria-pressed={category === name}
              onclick={() => (category = category === name ? null : name)}
              class={cn(
                "h-7 shrink-0 rounded-pill border px-2.5 text-caption transition-colors",
                category === name
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-hairline text-ink-secondary hover:bg-canvas-soft",
              )}
            >
              {name}
            </button>
          {/each}
        </div>
      {/if}

      <div
        class="flex shrink-0 items-center gap-1.5 rounded-pill border border-hairline px-2 py-1"
        title="Cash in the drawer today"
      >
        <Wallet class="size-3.5 text-ink-mute" />
        <span class="text-caption text-ink-secondary">Till</span>
        <span class="tnum text-button-sm text-ink">{formatUGX(till.inDrawer)}</span>
      </div>

      <p class="sr-only" aria-live="polite">
        {loading ? "Loading products" : `${products.length} products shown`}
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      {#if error}
        <div
          class="flex flex-col items-center rounded-lg border border-hairline bg-canvas px-6 py-12 text-center"
          role="alert"
        >
          <p class="text-heading-sm text-ink">Could not load products</p>
          <p class="mt-1 break-words text-body-md text-ink-mute">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            class="mt-4"
            onclick={() => reloadKey++}
          >
            <RefreshCw class="size-4" />
            Try again
          </Button>
        </div>
      {:else if loading && !products.length}
        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5"
          aria-busy="true"
        >
          {#each Array(8) as _, index (index)}
            <div
              class="h-20 animate-pulse rounded-lg border border-hairline bg-canvas-soft"
            ></div>
          {/each}
        </div>
      {:else if products.length}
        <TerminalGrid {products} onpick={(product) => cart.add(product)} />
      {:else}
        <div
          class="flex flex-col items-center rounded-lg border border-dashed border-hairline bg-canvas px-6 py-12 text-center"
        >
          {#if query || category}
            <SearchX class="size-6 text-ink-mute" />
            <p class="mt-3 text-heading-sm text-ink">No matching products</p>
            <p class="mt-1 text-body-md text-ink-mute">
              Try another search or category.
            </p>
          {:else}
            <PackageSearch class="size-6 text-ink-mute" />
            <p class="mt-3 text-heading-sm text-ink">No products yet</p>
            <p class="mt-1 text-body-md text-ink-mute">
              Add products to start selling.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <aside
    class="flex min-h-[360px] shrink-0 flex-col border-t border-hairline bg-canvas lg:min-h-0 lg:w-[360px] lg:border-l lg:border-t-0"
  >
    <CartPanel oncharge={charge} {charging} />
  </aside>
</div>
