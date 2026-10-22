<script lang="ts">
  import { ChevronRight, Receipt, RefreshCw, SearchX } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import OrderStatusBadge from "$lib/components/order/OrderStatusBadge.svelte";
  import Table from "$lib/components/table/Table.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import {
    listOrders,
    type OrderStatus,
    type OrderSummary,
  } from "$lib/db/orders";
  import { errorMessage, formatDateTime, formatUGX } from "$lib/utils";

  type StatusFilter = OrderStatus | "all";

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All orders" },
    { value: "completed", label: "Completed" },
    { value: "void", label: "Void" },
  ];

  let search = $state("");
  let query = $state("");
  let status = $state<StatusFilter>("all");
  let reloadKey = $state(0);
  let rows = $state<OrderSummary[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Debounce typing so each keystroke doesn't hit SQLite.
  $effect(() => {
    const term = search;
    const timer = setTimeout(() => {
      query = term.trim();
    }, 200);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const term = query;
    const filter = status;
    void reloadKey;

    let cancelled = false;
    loading = true;
    error = null;

    listOrders({ search: term, status: filter })
      .then((result) => {
        if (!cancelled) rows = result;
      })
      .catch((cause: unknown) => {
        if (!cancelled) error = errorMessage(cause);
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  /** Sales collected in the current view, void orders excluded. */
  const collected = $derived(
    rows
      .filter((row) => row.status === "completed")
      .reduce((sum, row) => sum + row.total, 0),
  );
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <PageHeader eyebrow="Register 01" title="Orders">
    <p aria-live="polite">
      {#if loading}
        Loading orders…
      {:else}
        {rows.length}
        {rows.length === 1 ? "order" : "orders"} · {formatUGX(collected)} collected
      {/if}
    </p>

    {#snippet actions()}
      <div class="w-full sm:w-64">
        <Input
          bind:value={search}
          placeholder="Search order number…"
          aria-label="Search orders"
        />
      </div>
      <div class="w-full sm:w-40">
        <Select bind:value={status} options={STATUS_OPTIONS} aria-label="Status" />
      </div>
    {/snippet}
  </PageHeader>

  {#if error}
    <EmptyState
      class="mt-6"
      title="Could not load orders"
      description={error}
    >
      {#snippet icon()}
        <RefreshCw class="size-6" />
      {/snippet}
      {#snippet actions()}
        <Button variant="secondary" size="sm" onclick={() => reloadKey++}>
          <RefreshCw class="size-4" />
          Try again
        </Button>
      {/snippet}
    </EmptyState>
  {:else if loading}
    <div
      class="mt-6 h-72 animate-pulse rounded-lg border border-hairline bg-canvas-soft"
      aria-busy="true"
    ></div>
  {:else if rows.length}
    <Table
      class="mt-6"
      headers={[
        "Order",
        "Date",
        "Items",
        "Status",
        "Subtotal",
        "VAT",
        "Total",
        "Payment",
        "",
      ]}
    >
      {#each rows as order (order.id)}
        <tr class="group transition-colors hover:bg-canvas-soft">
          <td class="whitespace-nowrap px-4 py-3">
            <a
              href="/orders/{order.id}"
              class="text-body-tabular text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {order.orderNo}
            </a>
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-ink-mute">
            {formatDateTime(order.createdAt)}
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-ink-mute">
            {order.itemCount}
            {order.itemCount === 1 ? "line" : "lines"}
            <span class="text-ink-mute-2">· {order.unitCount} units</span>
          </td>
          <td class="whitespace-nowrap px-4 py-3">
            <OrderStatusBadge status={order.status} />
          </td>
          <td class="tnum whitespace-nowrap px-4 py-3 text-ink-secondary">
            {formatUGX(order.subtotal)}
          </td>
          <td class="tnum whitespace-nowrap px-4 py-3 text-ink-mute">
            {formatUGX(order.tax)}
            <span class="text-ink-mute-2">({order.taxRate}%)</span>
          </td>
          <td class="tnum whitespace-nowrap px-4 py-3 font-medium text-ink">
            {formatUGX(order.total)}
          </td>
          <td class="whitespace-nowrap px-4 py-3 capitalize text-ink-mute">
            {order.paymentMethod}
          </td>
          <td class="px-2 py-3 text-right">
            <a
              href="/orders/{order.id}"
              aria-label={`Open ${order.orderNo}`}
              class="inline-flex items-center text-ink-mute transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ChevronRight class="size-4" />
            </a>
          </td>
        </tr>
      {/each}
    </Table>
  {:else if query}
    <EmptyState
      class="mt-6"
      title={`No orders match “${query}”`}
      description="Try a different order number."
    >
      {#snippet icon()}
        <SearchX class="size-6" />
      {/snippet}
      {#snippet actions()}
        <Button
          variant="secondary"
          size="sm"
          onclick={() => {
            search = "";
            query = "";
          }}
        >
          Clear search
        </Button>
      {/snippet}
    </EmptyState>
  {:else if status !== "all"}
    <EmptyState
      class="mt-6"
      title="No {status} orders"
      description="Orders will appear here as soon as they are recorded."
    >
      {#snippet icon()}
        <Receipt class="size-6" />
      {/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      class="mt-6"
      title="No orders yet"
      description="Charge a sale on the terminal and it will show up here."
    >
      {#snippet icon()}
        <Receipt class="size-6" />
      {/snippet}
      {#snippet actions()}
        <Button size="sm" href="/">Open the terminal</Button>
      {/snippet}
    </EmptyState>
  {/if}
</div>
