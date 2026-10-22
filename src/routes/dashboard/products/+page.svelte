<script lang="ts">
  import Input from "$lib/components/input/Input.svelte";
  import ProductCard from "$lib/components/product-card/ProductCard.svelte";
  import { products } from "$lib/data/products";

  let search = $state("");

  const filtered = $derived(
    products.filter((product) =>
      `${product.name} ${product.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ),
  );
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="eyebrow text-ink-mute">Catalog</p>
      <h1 class="mt-1 text-display-lg text-ink">Products</h1>
      <p class="mt-1 text-body-md text-ink-mute">
        {products.length} items available on this register.
      </p>
    </div>

    <div class="w-full sm:w-72">
      <Input
        bind:value={search}
        placeholder="Search products…"
        aria-label="Search products"
      />
    </div>
  </header>

  {#if filtered.length}
    <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each filtered as product (product.id)}
        <li>
          <ProductCard {product} />
        </li>
      {/each}
    </ul>
  {:else}
    <div
      class="mt-6 rounded-lg border border-dashed border-hairline bg-canvas px-6 py-16 text-center"
    >
      <p class="text-heading-sm text-ink">No products match “{search}”</p>
      <p class="mt-1 text-body-md text-ink-mute">
        Try a different name or category.
      </p>
    </div>
  {/if}
</div>
