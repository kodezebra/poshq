<script lang="ts">
  import { Package, Tag } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import type { Product } from "$lib/types";

  let {
    product,
    class: className,
  }: { product: Product; class?: string } = $props();
</script>

<article
  class={cn(
    "group flex flex-col overflow-hidden rounded-lg border border-hairline bg-canvas transition-shadow hover:shadow-elev-2",
    className,
  )}
>
  <div class="aspect-[16/10] w-full overflow-hidden bg-canvas-soft">
    {#if product.image}
      <img
        src={product.image}
        alt={product.name}
        class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
    {:else}
      <div class="flex size-full items-center justify-center">
        <Package class="size-7 text-hairline-input" />
      </div>
    {/if}
  </div>

  <div class="flex flex-1 flex-col gap-1.5 p-4">
    <div class="flex items-start justify-between gap-2">
      <h3 class="line-clamp-1 text-body-md text-ink">{product.name}</h3>
      <span class="tnum shrink-0 text-body-md text-ink">{product.price}</span>
    </div>
    <div class="flex items-center gap-1.5 text-caption text-ink-mute">
      <Tag class="size-3.5" />
      <span>{product.category}</span>
    </div>
  </div>
</article>
