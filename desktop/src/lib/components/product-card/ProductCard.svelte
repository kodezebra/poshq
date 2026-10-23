<script lang="ts">
  import { Tag } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { cn, formatUGX } from "$lib/utils";
  import type { Product } from "$lib/db/schema";

  let {
    product,
    actions,
    onedit,
    class: className,
  }: {
    product: Product;
    actions?: Snippet;
    /** Makes the whole card an edit target, matching a table row. */
    onedit?: () => void;
    class?: string;
  } = $props();
</script>

<article
  class={cn(
    "group relative flex flex-col overflow-hidden rounded-lg border border-hairline bg-canvas transition-colors hover:border-hairline-input",
    className,
  )}
>
  {#if onedit}
    <button
      type="button"
      onclick={onedit}
      aria-label={`Edit ${product.name}`}
      class="absolute inset-0 z-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    ></button>
  {/if}

  <div class="flex h-20 w-full items-center justify-center overflow-hidden bg-canvas-soft">
    {#if product.imageUrl}
      <img
        src={product.imageUrl}
        alt={product.name}
        class="size-full object-cover"
      />
    {:else}
      <span class="text-body-lg text-ink-faint" aria-hidden="true">
        {product.name.charAt(0)}
      </span>
    {/if}
  </div>

  <div class="flex flex-1 flex-col gap-1 p-3">
    <div class="flex items-start justify-between gap-2">
      <h3 class="line-clamp-1 text-body-md text-ink">{product.name}</h3>
      <span class="tnum shrink-0 text-body-md text-ink">
        {formatUGX(product.price)}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-caption text-ink-mute">
      <Tag class="size-3.5" />
      <span class="truncate">{product.category}</span>
    </div>
  </div>

  {#if actions}
    <div
      class="relative z-10 flex items-center justify-end border-t border-hairline px-2 py-1"
    >
      {@render actions()}
    </div>
  {/if}
</article>
