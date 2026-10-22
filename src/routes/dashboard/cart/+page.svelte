<script lang="ts">
  import { ShoppingCart } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header>
    <p class="eyebrow text-ink-mute">Register 01</p>
    <h1 class="mt-1 text-display-lg text-ink">Cart</h1>
    <p class="mt-1 text-body-md text-ink-mute">
      Scan or pick items to start a sale.
    </p>
  </header>

  <Card class="mt-6">
    <div class="flex flex-col items-center py-12 text-center">
      <span
        class="flex size-12 items-center justify-center rounded-full bg-canvas-soft text-ink-mute"
      >
        <ShoppingCart class="size-5" />
      </span>
      <p class="mt-4 text-heading-sm text-ink">Your cart is empty</p>
      <p class="mt-1 max-w-sm text-body-md text-ink-mute">
        Items you add will appear here with their price and quantity.
      </p>
      <Button href="/dashboard/products" variant="secondary" class="mt-5">
        Browse products
      </Button>
    </div>
  </Card>
</div>
