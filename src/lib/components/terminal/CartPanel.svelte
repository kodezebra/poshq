<script lang="ts">
  import { ShoppingBasket } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import { cart } from "$lib/stores/cart.svelte";
  import { formatUGX } from "$lib/utils";
  import CartLine from "./CartLine.svelte";
  import OrderTotals from "./OrderTotals.svelte";

  let {
    oncharge,
    charging = false,
  }: { oncharge?: () => void; charging?: boolean } = $props();
</script>

<div class="flex h-full min-h-0 flex-col">
  <header
    class="flex items-center justify-between gap-3 border-b border-hairline p-4"
  >
    <div>
      <p class="text-heading-sm text-ink">Current sale</p>
      <p class="text-caption text-ink-mute">
        {cart.count}
        {cart.count === 1 ? "item" : "items"}
      </p>
    </div>
    {#if !cart.isEmpty}
      <Button variant="ghost" size="sm" onclick={() => cart.clear()}>
        Clear
      </Button>
    {/if}
  </header>

  {#if cart.isEmpty}
    <div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span
        class="flex size-12 items-center justify-center rounded-full bg-canvas-soft text-ink-mute"
      >
        <ShoppingBasket class="size-5" />
      </span>
      <p class="mt-4 text-heading-sm text-ink">Cart is empty</p>
      <p class="mt-1 max-w-xs text-body-md text-ink-mute">
        Tap a product to add it to this sale.
      </p>
    </div>
  {:else}
    <ul class="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto px-4">
      {#each cart.lines as line (line.productId)}
        <CartLine
          {line}
          onqty={(qty) => cart.setQty(line.productId, qty)}
          onremove={() => cart.remove(line.productId)}
        />
      {/each}
    </ul>
  {/if}

  <footer class="border-t border-hairline p-4">
    <OrderTotals
      subtotal={cart.subtotal}
      tax={cart.tax}
      vatRate={cart.vatRate}
      total={cart.total}
    />

    {#if oncharge}
      <Button
        class="mt-4 w-full"
        disabled={cart.isEmpty || charging}
        onclick={oncharge}
      >
        {charging ? "Charging…" : `Charge ${formatUGX(cart.total)}`}
      </Button>
    {/if}
  </footer>
</div>
