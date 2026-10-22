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

<li class="flex items-center gap-1 py-1.5">
  <div class="min-w-0 flex-1" title={`${line.name} — ${formatUGX(line.unitPrice)} each`}>
    <p class="truncate text-body-md text-ink">{line.name}</p>
    <p class="tnum text-caption text-ink-mute">{formatUGX(line.unitPrice)} each</p>
  </div>

  <div class="flex shrink-0 items-center">
    <button
      type="button"
      class="inline-flex size-7 items-center justify-center rounded-sm border border-hairline-input text-ink-secondary transition-colors hover:bg-canvas-soft"
      aria-label={`Decrease ${line.name}`}
      onclick={() => onqty(line.qty - 1)}
    >
      <Minus class="size-3" />
    </button>
    <span class="tnum w-7 text-center text-caption text-ink">{line.qty}</span>
    <button
      type="button"
      class="inline-flex size-7 items-center justify-center rounded-sm border border-hairline-input text-ink-secondary transition-colors hover:bg-canvas-soft"
      aria-label={`Increase ${line.name}`}
      onclick={() => onqty(line.qty + 1)}
    >
      <Plus class="size-3" />
    </button>
  </div>

  <span class="tnum w-16 shrink-0 text-right text-body-md text-ink">
    {formatUGX(lineTotal(line))}
  </span>

  <button
    type="button"
    class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink"
    aria-label={`Remove ${line.name}`}
    onclick={onremove}
  >
    <X class="size-3" />
  </button>
</li>
