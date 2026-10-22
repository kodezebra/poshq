<script lang="ts">
  import { PackageSearch, RefreshCw, SearchX } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import ProductCard from "$lib/components/product-card/ProductCard.svelte";
  import { listProducts } from "$lib/db/products";
  import type { Product } from "$lib/db/schema";

  let search = $state("");
  let query = $state("");
  let reloadKey = $state(0);
  let products = $state<Product[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

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
    void reloadKey;

    let cancelled = false;
    loading = true;
    error = null;

    listProducts({ search: term })
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
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="eyebrow text-ink-mute">Catalog</p>
      <h1 class="mt-1 text-display-lg text-ink">Products</h1>
      <p class="mt-1 text-body-md text-ink-mute" aria-live="polite">
        {#if loading}
          Loading the catalog…
        {:else}
          {products.length}
          {products.length === 1 ? "item" : "items"}
          {query ? "matching your search" : "available on this register"}.
        {/if}
      </p>
    </div>

    <div class="w-full sm:w-72">
      <Input
        bind:value={search}
        placeholder="Search name, SKU or category…"
        aria-label="Search products"
      />
    </div>
  </header>

  {#if error}
    <div
      class="mt-6 rounded-lg border border-hairline bg-canvas p-6"
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
  {:else if loading}
    <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {#each Array(8) as _, index (index)}
        <li
          class="h-56 animate-pulse rounded-lg border border-hairline bg-canvas-soft"
        ></li>
      {/each}
    </ul>
  {:else if products.length}
    <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each products as product (product.id)}
        <li>
          <ProductCard {product} />
        </li>
      {/each}
    </ul>
  {:else}
    <div
      class="mt-6 flex flex-col items-center rounded-lg border border-dashed border-hairline bg-canvas px-6 py-16 text-center"
    >
      {#if query}
        <SearchX class="size-6 text-ink-mute" />
        <p class="mt-3 text-heading-sm text-ink">No products match “{query}”</p>
        <p class="mt-1 text-body-md text-ink-mute">
          Try a different name, SKU or category.
        </p>
      {:else}
        <PackageSearch class="size-6 text-ink-mute" />
        <p class="mt-3 text-heading-sm text-ink">No products yet</p>
        <p class="mt-1 text-body-md text-ink-mute">
          Add your first product to start selling.
        </p>
      {/if}
    </div>
  {/if}
</div>
