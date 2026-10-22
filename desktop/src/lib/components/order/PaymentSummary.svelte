<script lang="ts">
  import { Banknote, CreditCard } from "@lucide/svelte";
  import type { PaymentMethod } from "$lib/payment";
  import { formatUGX } from "$lib/utils";

  let {
    method,
    tendered,
    change = 0,
    compact = false,
  }: {
    method: PaymentMethod;
    /** What was handed over. */
    tendered: number;
    /** Change given back from the till. */
    change?: number;
    /** Table cell form: the method and the amounts stacked on single lines. */
    compact?: boolean;
  } = $props();

  const label = $derived(method === "cash" ? "Cash" : "Card");
</script>

{#if compact}
  <span class="flex flex-col gap-0.5">
    <span class="inline-flex items-center gap-1.5">
      {#if method === "cash"}
        <Banknote class="size-3.5 shrink-0 text-ink-mute" />
      {:else}
        <CreditCard class="size-3.5 shrink-0 text-ink-mute" />
      {/if}
      <span class="text-ink-mute">{label}</span>
      <span class="tnum text-ink-secondary">{formatUGX(tendered)}</span>
    </span>
    {#if method === "cash" && change > 0}
      <span class="tnum text-caption text-ink-mute-2">
        Change {formatUGX(change)}
      </span>
    {/if}
  </span>
{:else}
  <dl class="mt-3 flex flex-col gap-2 border-t border-hairline pt-3 text-body-md">
    <div class="flex items-center justify-between">
      <dt class="text-ink-mute">Method</dt>
      <dd class="inline-flex items-center gap-1.5 text-ink">
        {#if method === "cash"}
          <Banknote class="size-4" />
        {:else}
          <CreditCard class="size-4" />
        {/if}
        {label}
      </dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-ink-mute">Tendered</dt>
      <dd class="tnum text-ink">{formatUGX(tendered)}</dd>
    </div>
    {#if change > 0}
      <div class="flex items-center justify-between">
        <dt class="text-ink-mute">Change given</dt>
        <dd class="tnum text-ink">{formatUGX(change)}</dd>
      </div>
    {/if}
  </dl>
{/if}
