<script lang="ts">
  import { formatUGX } from "$lib/utils";

  let {
    subtotal,
    tax,
    vatRate,
    total,
    compact = false,
  }: {
    subtotal: number;
    tax: number;
    vatRate: number;
    total: number;
    /** Two-line summary, for tight footers such as the cart. */
    compact?: boolean;
  } = $props();
</script>

{#if compact}
  <dl class="flex flex-col gap-1">
    <div
      class="flex items-baseline justify-between gap-3 text-caption text-ink-mute"
    >
      <dt>Subtotal</dt>
      <dd class="tnum text-ink-secondary">{formatUGX(subtotal)}</dd>
    </div>
    <div
      class="flex items-baseline justify-between gap-3 text-caption text-ink-mute"
    >
      <dt>VAT ({vatRate}%)</dt>
      <dd class="tnum text-ink-secondary">{formatUGX(tax)}</dd>
    </div>
    <div
      class="mt-1 flex items-baseline justify-between gap-3 border-t border-hairline pt-2"
    >
      <dt class="text-caption text-ink-mute">Total</dt>
      <dd class="tnum text-display-lg text-ink">{formatUGX(total)}</dd>
    </div>
  </dl>
{:else}
  <dl class="flex flex-col gap-2 text-body-md">
    <div class="flex items-center justify-between">
      <dt class="text-ink-mute">Subtotal</dt>
      <dd class="tnum text-ink">{formatUGX(subtotal)}</dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-ink-mute">VAT ({vatRate}%)</dt>
      <dd class="tnum text-ink">{formatUGX(tax)}</dd>
    </div>
    <div
      class="flex items-center justify-between border-t border-hairline pt-2 text-heading-sm"
    >
      <dt class="text-ink">Total</dt>
      <dd class="tnum text-ink">{formatUGX(total)}</dd>
    </div>
  </dl>
{/if}
