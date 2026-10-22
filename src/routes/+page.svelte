<script lang="ts">
  import { onMount } from "svelte";
  import { PackageSearch, RefreshCw, SearchX } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import CartPanel from "$lib/components/terminal/CartPanel.svelte";
  import TerminalGrid from "$lib/components/terminal/TerminalGrid.svelte";
  import type { Product } from "$lib/db/schema";
  import { createOrder } from "$lib/db/orders";
  import { listProducts } from "$lib/db/products";
  import { getVatRate } from "$lib/db/settings";
  import { cart } from "$lib/stores/cart.svelte";
  import { cn, formatUGX } from "$lib/utils";

  const SEARCH_ID = "terminal-search";

  let search = $state("");
  let query = $state("");
  let category = $state<string | null>(null);
  let categories = $state<string[]>([]);
  let products = $state<Product[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let charging = $state(false);
  let reloadKey = $state(0);

  const focusSearch = () => document.getElementById(SEARCH_ID)?.focus();

  onMount(() => {
    focusSearch();

    getVatRate()
      .then((rate) => cart.setVatRate(rate))
      .catch((cause) => console.error("load vat rate", cause));

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
        error = cause instanceof Error ? cause.message : String(cause);
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

  async function charge() {
    if (cart.isEmpty || charging) return;
    charging = true;

    try {
      const order = await createOrder({
        lines: [...cart.lines],
        vatRate: cart.vatRate,
      });

      toast.success(`Order ${order.orderNo} charged`, {
        description: `${formatUGX(order.total)} · ${cart.count} ${
          cart.count === 1 ? "item" : "items"
        }`,
      });

      cart.clear();
      search = "";
      query = "";
      focusSearch();
    } catch (cause) {
      toast.error("Could not complete the sale", {
        description: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      charging = false;
    }
  }
</script>

<div
  class="flex min-h-[calc(100vh-3.5rem)] flex-col lg:h-[calc(100vh-3.5rem)] lg:flex-row"
>
  <section class="flex min-h-0 flex-1 flex-col">
    <header class="border-b border-hairline bg-canvas p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1 basis-64">
          <Input
            id={SEARCH_ID}
            bind:value={search}
            onkeydown={addFromSearch}
            placeholder="Scan or search products…"
            aria-label="Scan or search products"
          />
        </div>
        <p class="text-caption text-ink-mute" aria-live="polite">
          {loading ? "Loading…" : `${products.length} shown`}
        </p>
      </div>

      {#if categories.length}
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={category === null}
            onclick={() => (category = null)}
            class={cn(
              "h-8 rounded-pill border px-3 text-caption transition-colors",
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
                "h-8 rounded-pill border px-3 text-caption transition-colors",
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
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-4">
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
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {#each Array(8) as _, index (index)}
            <div
              class="h-24 animate-pulse rounded-lg border border-hairline bg-canvas-soft"
            ></div>
          {/each}
        </div>
      {:else if products.length}
        <TerminalGrid {products} onpick={(product) => cart.add(product)} />
      {:else}
        <div
          class="flex flex-col items-center rounded-lg border border-dashed border-hairline bg-canvas px-6 py-16 text-center"
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
    class="flex min-h-[380px] shrink-0 flex-col border-t border-hairline bg-canvas lg:min-h-0 lg:w-[380px] lg:border-l lg:border-t-0"
  >
    <CartPanel oncharge={charge} {charging} />
  </aside>
</div>
