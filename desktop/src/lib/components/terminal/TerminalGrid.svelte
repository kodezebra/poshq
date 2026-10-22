<script lang="ts">
  import type { Product } from "$lib/db/schema";
  import ProductTile from "./ProductTile.svelte";

  let {
    products,
    onpick,
  }: { products: Product[]; onpick: (product: Product) => void } = $props();
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2.5">
  {#each products as product (product.id)}
    <li>
      <ProductTile {product} {onpick} />
    </li>
  {/each}
</ul>
