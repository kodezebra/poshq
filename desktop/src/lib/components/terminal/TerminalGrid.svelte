<script lang="ts">
  import type { Product } from "$lib/db/schema";
  import ProductTile from "./ProductTile.svelte";

  let {
    products,
    onpick,
  }: { products: Product[]; onpick: (product: Product) => void } = $props();
</script>

<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
  {#each products as product (product.id)}
    <li>
      <ProductTile {product} {onpick} />
    </li>
  {/each}
</ul>
