<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
  import Table from "$lib/components/table/Table.svelte";
  import { products } from "$lib/data/products";
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="eyebrow text-ink-mute">Register 01</p>
      <h1 class="mt-1 text-display-lg text-ink">Dashboard</h1>
      <p class="mt-1 text-body-md text-ink-mute">
        Today at a glance — sales, orders and catalog.
      </p>
    </div>

    <Button href="/dashboard/cart">
      <Plus class="size-4" />
      New sale
    </Button>
  </header>

  <section class="mt-6 grid gap-4 sm:grid-cols-3">
    <Card>
      <p class="eyebrow text-ink-mute">Today's sales</p>
      <p class="tnum mt-2 text-display-md text-ink">$0.00</p>
      <p class="mt-1 text-caption text-ink-mute">No transactions yet</p>
    </Card>

    <Card>
      <p class="eyebrow text-ink-mute">Orders</p>
      <p class="tnum mt-2 text-display-md text-ink">0</p>
      <p class="mt-1 text-caption text-ink-mute">The register is open</p>
    </Card>

    <Card>
      <p class="eyebrow text-ink-mute">Items in catalog</p>
      <p class="tnum mt-2 text-display-md text-ink">{products.length}</p>
      <p class="mt-1 text-caption text-ink-mute">Ready to sell</p>
    </Card>
  </section>

  <section class="mt-8">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-heading-md text-ink">Catalog</h2>
        <p class="mt-0.5 text-caption text-ink-mute">
          Everything available on this register.
        </p>
      </div>
      <a
        href="/dashboard/products"
        class="text-body-md text-primary transition-colors hover:text-primary-deep"
      >
        View all
      </a>
    </div>

    <Table headers={["Item", "Category", "Price"]} class="mt-3">
      {#each products as product (product.id)}
        <tr class="transition-colors hover:bg-canvas-soft">
          <td class="px-4 py-3 text-ink">{product.name}</td>
          <td class="px-4 py-3 text-ink-mute">{product.category}</td>
          <td class="tnum px-4 py-3 text-ink">{product.price}</td>
        </tr>
      {/each}
    </Table>
  </section>
</div>
