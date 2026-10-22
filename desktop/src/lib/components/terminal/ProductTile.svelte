<script lang="ts">
  import type { Product } from "$lib/db/schema";
  import { cn, formatUGX } from "$lib/utils";

  let {
    product,
    class: className,
    onpick,
  }: {
    product: Product;
    class?: string;
    onpick: (product: Product) => void;
  } = $props();
</script>

<button
  type="button"
  onclick={() => onpick(product)}
  class={cn(
    "flex h-full w-full flex-col justify-between gap-2 rounded-lg border border-hairline bg-canvas p-3 text-left",
    "transition-colors hover:border-primary/40 hover:bg-primary/5 active:bg-primary/10",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    className,
  )}
>
  <span class="line-clamp-2 text-body-md text-ink">{product.name}</span>
  <span class="flex items-end justify-between gap-1.5">
    <span class="line-clamp-1 text-caption text-ink-mute">
      {product.category}
    </span>
    <span class="tnum shrink-0 text-body-tabular text-ink">
      {formatUGX(product.price)}
    </span>
  </span>
</button>
