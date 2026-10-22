<script lang="ts">
  import { Receipt, RefreshCw, SearchX } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import OrderStatusBadge from "$lib/components/order/OrderStatusBadge.svelte";
  import PaymentSummary from "$lib/components/order/PaymentSummary.svelte";
  import Table from "$lib/components/table/Table.svelte";
  import type { TableColumn, TableSort } from "$lib/components/table/types";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import {
    listOrders,
    type OrderStatus,
    type OrderSummary,
  } from "$lib/db/orders";
  import { sortOrders } from "$lib/order-sort";
  import { errorMessage, formatDateTime, formatUGX } from "$lib/utils";

  type StatusFilter = OrderStatus | "all";

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All orders" },
    { value: "completed", label: "Completed" },
    { value: "void", label: "Void" },
  ];

  const COLUMNS: TableColumn[] = [
    { label: "Order", sortKey: "order" },
    { label: "Date", sortKey: "date" },
    { label: "Items", align: "end", sortKey: "items" },
    { label: "Status" },
    { label: "Total", align: "end", sortKey: "total" },
    { label: "Payment" },
  ];

  let search = $state("");
  let query = $state("");
  let status = $state<StatusFilter>("all");
  let reloadKey = $state(0);
  let rows = $state<OrderSummary[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let sort = $state<TableSort>({ key: "date", direction: "desc" });

  /**
   * Re-clicking a column reverses it; a new column opens on the direction that
   * answers the usual question. Dates and money are asked for newest and
   * largest first, names and counts ascend.
   */
  function toggleSort(key: string) {
    if (sort?.key === key) {
      sort = { key, direction: sort.direction === "desc" ? "asc" : "desc" };
      return;
    }
    const descending = key === "date" || key === "total" || key === "items";
    sort = { key, direction: descending ? "desc" : "asc" };
  }

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

  /** The view is fully loaded, so ordering is a local concern. */
  const sorted = $derived(sortOrders(rows, sort));
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
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
      <div class="w-full sm:w-60">
        <Input
          bind:value={search}
          placeholder="Search order number…"
          aria-label="Search orders"
          class="h-9"
        />
      </div>
      <div class="w-full sm:w-36">
        <Select
          bind:value={status}
          options={STATUS_OPTIONS}
          aria-label="Status"
          class="h-9"
        />
      </div>
    {/snippet}
  </PageHeader>

  {#if error}
    <EmptyState
      class="mt-4"
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
      class="mt-4 h-72 animate-pulse rounded-lg border border-hairline bg-canvas-soft"
      aria-busy="true"
    ></div>
  {:else if rows.length}
    <Table class="mt-4" columns={COLUMNS} {sort} onsort={toggleSort}>
      {#each sorted as order (order.id)}
        <tr class="relative transition-colors hover:bg-canvas-soft">
          <td class="whitespace-nowrap px-3 py-2">
            <a
              href="/orders/{order.id}"
              class="code text-body-tabular text-primary underline-offset-2 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {order.orderNo}
            </a>
          </td>
          <td class="whitespace-nowrap px-3 py-2 text-ink-mute">
            {formatDateTime(order.createdAt)}
          </td>
          <td
            class="tnum whitespace-nowrap px-3 py-2 text-end text-ink-mute"
          >
            {order.itemCount}×
            <span class="text-ink-mute-2">
              · {order.unitCount} {order.unitCount === 1 ? "unit" : "units"}
            </span>
          </td>
          <td class="whitespace-nowrap px-3 py-2">
            <OrderStatusBadge status={order.status} />
          </td>
          <td
            class="tnum whitespace-nowrap px-3 py-2 text-end font-medium text-ink"
          >
            {formatUGX(order.total)}
            <span class="font-normal text-caption text-ink-mute-2">
              VAT {order.taxRate}%
            </span>
          </td>
          <td class="whitespace-nowrap px-3 py-2">
            <PaymentSummary
              compact
              method={order.paymentMethod}
              tendered={order.tendered}
              change={order.changeGiven}
            />
          </td>
        </tr>
      {/each}
    </Table>
  {:else if query}
    <EmptyState
      class="mt-4"
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
      class="mt-4"
      title="No {status} orders"
      description="Orders will appear here as soon as they are recorded."
    >
      {#snippet icon()}
        <Receipt class="size-6" />
      {/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      class="mt-4"
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
