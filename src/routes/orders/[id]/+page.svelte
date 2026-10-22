<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { ArrowLeft, Ban, RefreshCw, Trash2 } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
  import OrderStatusBadge from "$lib/components/order/OrderStatusBadge.svelte";
  import PaymentSummary from "$lib/components/order/PaymentSummary.svelte";
  import Table from "$lib/components/table/Table.svelte";
  import OrderTotals from "$lib/components/terminal/OrderTotals.svelte";
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import {
    deleteOrder,
    getOrder,
    voidOrder,
    type OrderWithItems,
  } from "$lib/db/orders";
  import { errorMessage, formatDateTime, formatUGX } from "$lib/utils";

  const orderId = $derived(page.params.id ?? "");

  let record = $state<OrderWithItems | undefined>(undefined);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let reloadKey = $state(0);

  let confirmOpen = $state(false);
  let confirmAction = $state<"void" | "delete">("void");
  let busy = $state(false);

  $effect(() => {
    const id = orderId;
    void reloadKey;

    let cancelled = false;
    loading = true;
    error = null;

    getOrder(id)
      .then((result) => {
        if (!cancelled) record = result;
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

  function ask(action: "void" | "delete") {
    confirmAction = action;
    confirmOpen = true;
  }

  async function runConfirmedAction() {
    if (!record || busy) return;

    const { order } = record;
    busy = true;

    try {
      if (confirmAction === "void") {
        await voidOrder(order.id);
        toast.success(`${order.orderNo} marked as void`);
      } else {
        await deleteOrder(order.id);
        toast.success(`${order.orderNo} deleted`);
        await goto("/orders");
        return;
      }

      confirmOpen = false;
      reloadKey++;
    } catch (cause) {
      toast.error(
        confirmAction === "void" ? "Could not void order" : "Could not delete order",
        { description: errorMessage(cause) },
      );
    } finally {
      busy = false;
    }
  }
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <a
    href="/orders"
    class="inline-flex items-center gap-1.5 text-caption text-ink-mute transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    <ArrowLeft class="size-3.5" />
    All orders
  </a>

  {#if error}
    <EmptyState
      class="mt-6"
      title="Could not load this order"
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
  {:else if !record}
    <EmptyState
      class="mt-6"
      title="Order not found"
      description="This order may have been deleted."
    >
      {#snippet actions()}
        <Button size="sm" href="/orders">Back to orders</Button>
      {/snippet}
    </EmptyState>
  {:else}
    {@const order = record.order}
    {@const items = record.items}

    <PageHeader class="mt-4" eyebrow="Order" title={order.orderNo}>
      <p>
        {formatDateTime(order.createdAt)}
      </p>

      {#snippet actions()}
        <OrderStatusBadge status={order.status} />
        {#if order.status === "completed"}
          <Button variant="secondary" onclick={() => ask("void")}>
            <Ban class="size-4" />
            Void
          </Button>
        {/if}
        <Button variant="ghost" onclick={() => ask("delete")}>
          <Trash2 class="size-4" />
          Delete
        </Button>
      {/snippet}
    </PageHeader>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <Table headers={["Item", "Qty", "Unit price", "Line total"]}>
          {#each items as item (item.id)}
            <tr>
              <td class="px-4 py-3 text-ink">{item.name}</td>
              <td class="tnum whitespace-nowrap px-4 py-3 text-ink-mute">
                {item.qty}
              </td>
              <td class="tnum whitespace-nowrap px-4 py-3 text-ink-secondary">
                {formatUGX(item.unitPrice)}
              </td>
              <td class="tnum whitespace-nowrap px-4 py-3 font-medium text-ink">
                {formatUGX(item.lineTotal)}
              </td>
            </tr>
          {/each}
        </Table>

        {#if order.status === "void"}
          <p class="mt-3 text-caption text-ruby">
            Voided {order.voidedAt ? formatDateTime(order.voidedAt) : ""} — the
            order is kept for the record but excluded from sales.
          </p>
        {/if}
      </div>

      <Card>
        <p class="text-caption text-ink-mute">Summary</p>
        <div class="mt-3">
          <OrderTotals
            subtotal={order.subtotal}
            tax={order.tax}
            vatRate={order.taxRate}
            total={order.total}
          />
        </div>
        <PaymentSummary
          method={order.paymentMethod}
          tendered={order.tendered}
          change={order.changeGiven}
        />
      </Card>
    </div>
  {/if}
</div>

<Dialog
  bind:open={confirmOpen}
  title={confirmAction === "void" ? "Void this order?" : "Delete this order?"}
  description={confirmAction === "void"
    ? "The order stays in the history, but it no longer counts as a sale."
    : "The order and its items are removed for good."}
>
  <div class="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
    <Button variant="secondary" type="button" onclick={() => (confirmOpen = false)}>
      Cancel
    </Button>
    <Button
      variant={confirmAction === "void" ? "secondary" : "danger"}
      type="button"
      onclick={runConfirmedAction}
      disabled={busy}
    >
      {busy
        ? "Working…"
        : confirmAction === "void"
          ? "Void order"
          : "Delete order"}
    </Button>
  </div>
</Dialog>
