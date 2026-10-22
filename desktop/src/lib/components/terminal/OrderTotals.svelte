<script lang="ts">
  import { formatUGX } from "$lib/utils";

  let {
    subtotal,
    tax,
    vatRate,
    total,
  }: {
    subtotal: number;
    tax: number;
    vatRate: number;
    total: number;
  } = $props();
</script>

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
