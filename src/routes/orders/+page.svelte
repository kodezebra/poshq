<script lang="ts">
  import { Receipt } from "@lucide/svelte";
  import Card from "$lib/components/card/Card.svelte";
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header>
    <p class="eyebrow text-ink-mute">Register 01</p>
    <h1 class="mt-1 text-display-lg text-ink">Orders</h1>
    <p class="mt-1 text-body-md text-ink-mute">
      Every completed transaction, newest first.
    </p>
  </header>

  <Card class="mt-6">
    <div class="flex flex-col items-center py-12 text-center">
      <span
        class="flex size-12 items-center justify-center rounded-full bg-canvas-soft text-ink-mute"
      >
        <Receipt class="size-5" />
      </span>
      <p class="mt-4 text-heading-sm text-ink">No orders yet</p>
      <p class="mt-1 max-w-sm text-body-md text-ink-mute">
        Completed sales will be recorded here with their totals and payment
        method.
      </p>
    </div>
  </Card>
</div>
