<script lang="ts">
  import { Minus, Plus, X } from "@lucide/svelte";
  import { lineTotal, type CartLine } from "$lib/stores/cart.svelte";
  import { formatUGX } from "$lib/utils";

  let {
    line,
    onqty,
    onremove,
  }: {
    line: CartLine;
    onqty: (qty: number) => void;
    onremove: () => void;
  } = $props();
</script>

<li class="py-3">
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <p class="truncate text-body-md text-ink">{line.name}</p>
      <p class="text-caption text-ink-mute">
        {formatUGX(line.unitPrice)} each
      </p>
    </div>
    <button
      type="button"
      class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink"
      aria-label={`Remove ${line.name}`}
      onclick={onremove}
    >
      <X class="size-3.5" />
    </button>
  </div>

  <div class="mt-2 flex items-center justify-between">
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="inline-flex size-7 items-center justify-center rounded-sm border border-hairline-input text-ink-secondary transition-colors hover:bg-canvas-soft disabled:opacity-40"
        aria-label={`Decrease ${line.name}`}
        onclick={() => onqty(line.qty - 1)}
      >
        <Minus class="size-3.5" />
      </button>
      <span class="tnum w-8 text-center text-body-md text-ink">{line.qty}</span>
      <button
        type="button"
        class="inline-flex size-7 items-center justify-center rounded-sm border border-hairline-input text-ink-secondary transition-colors hover:bg-canvas-soft"
        aria-label={`Increase ${line.name}`}
        onclick={() => onqty(line.qty + 1)}
      >
        <Plus class="size-3.5" />
      </button>
    </div>

    <span class="tnum text-body-md text-ink">{formatUGX(lineTotal(line))}</span>
  </div>
</li>
