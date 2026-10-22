<script lang="ts">
  import { ArrowLeft, ShoppingBasket } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import type { PaymentMethod } from "$lib/payment";
  import { cart } from "$lib/stores/cart.svelte";
  import { formatUGX } from "$lib/utils";
  import CartLine from "./CartLine.svelte";
  import OrderTotals from "./OrderTotals.svelte";
  import PaymentPad from "./PaymentPad.svelte";

  let {
    oncharge,
    charging = false,
  }: {
    oncharge?: (payment: { method: PaymentMethod; tendered: number }) => void;
    charging?: boolean;
  } = $props();

  /**
   * The cart owns the panel until the cashier commits to a payment. Keeping the
   * pad on its own view means the cart lines keep their full height.
   */
  let mode = $state<"cart" | "pay">("cart");

  // Charging (or clearing) empties the cart, which returns the next sale to the
  // cart view without any extra bookkeeping.
  $effect(() => {
    if (cart.isEmpty) mode = "cart";
  });
</script>

<div class="flex h-full min-h-0 flex-col">
  <header
    class="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2"
  >
    <div class="flex min-w-0 items-baseline gap-2">
      <p class="text-heading-sm text-ink">
        {mode === "pay" ? "Take payment" : "Current sale"}
      </p>
      <p class="text-caption text-ink-mute">
        {cart.count}
        {cart.count === 1 ? "item" : "items"}
      </p>
    </div>

    {#if mode === "pay"}
      <Button variant="ghost" size="sm" onclick={() => (mode = "cart")}>
        <ArrowLeft class="size-4" />
        Back
      </Button>
    {:else if !cart.isEmpty}
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
  {:else if mode === "pay" && oncharge}
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <PaymentPad
        total={cart.total}
        {charging}
        onconfirm={(payment) => oncharge(payment)}
      />
    </div>
  {:else}
    <ul class="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto px-3">
      {#each cart.lines as line (line.productId)}
        <CartLine
          {line}
          onqty={(qty) => cart.setQty(line.productId, qty)}
          onremove={() => cart.remove(line.productId)}
        />
      {/each}
    </ul>
  {/if}

  {#if !cart.isEmpty && mode === "cart" && oncharge}
    <footer class="border-t border-hairline p-3">
      <OrderTotals
        compact
        subtotal={cart.subtotal}
        tax={cart.tax}
        vatRate={cart.vatRate}
        total={cart.total}
      />
      <Button class="mt-2.5 w-full" onclick={() => (mode = "pay")}>
        Charge {formatUGX(cart.total)}
      </Button>
    </footer>
  {/if}
</div>
