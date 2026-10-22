import { and, desc, eq, gte, inArray, like, sql } from "drizzle-orm";
import { settle, type PaymentMethod } from "$lib/payment";
import type { CartLine } from "$lib/stores/cart.svelte";
import type { VatRate } from "$lib/utils";
import { db } from "./client";
import { friendlyError } from "./errors";
import { orderItems, orders, type Order, type OrderItem } from "./schema";

export type { PaymentMethod };
export type OrderStatus = "completed" | "void";

export type CheckoutInput = {
  lines: CartLine[];
  vatRate: VatRate;
  paymentMethod?: PaymentMethod;
  /** What the customer handed over. Defaults to the exact total. */
  tendered?: number;
};

export type CheckoutResult = {
  id: string;
  orderNo: string;
  subtotal: number;
  tax: number;
  total: number;
  /** How the sale was paid for. */
  paymentMethod: PaymentMethod;
  /** What was handed over. */
  tendered: number;
  /** Change given back from the till. */
  change: number;
};

function dayStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** `POS-YYYYMMDD-0001`, sequential within the local day. */
async function nextOrderNo(): Promise<string> {
  const prefix = `POS-${dayStamp()}-`;
  const last = await db
    .select({ orderNo: orders.orderNo })
    .from(orders)
    .where(like(orders.orderNo, `${prefix}%`))
    .orderBy(desc(orders.orderNo))
    .limit(1)
    .get();

  const sequence = last ? Number(last.orderNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

/**
 * Writes the order and its item snapshots in one transaction. Totals are
 * derived here from the lines so the persisted numbers can never drift from
 * the items they describe; the caller's cart is only a view of the same math.
 * The payment is settled here too — a sale that was not paid for never
 * reaches the database.
 */
export async function createOrder({
  lines,
  vatRate,
  paymentMethod = "cash",
  tendered,
}: CheckoutInput): Promise<CheckoutResult> {
  if (!lines.length) throw new Error("Cannot charge an empty cart.");

  const id = crypto.randomUUID();
  const orderNo = await nextOrderNo();
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.qty,
    0,
  );
  const tax = Math.round((subtotal * vatRate) / 100);
  const total = subtotal + tax;

  // A cash sale that does not cover the total is refused here, not left for
  // the drawer to discover at closing time.
  const payment = settle(total, paymentMethod, tendered ?? total);

  try {
    await db.batch([
      db.insert(orders).values({
        id,
        orderNo,
        subtotal,
        taxRate: vatRate,
        tax,
        total,
        paymentMethod: payment.method,
        tendered: payment.tendered,
        changeGiven: payment.change,
      }),
      ...lines.map((line) =>
        db.insert(orderItems).values({
          orderId: id,
          productId: line.productId,
          name: line.name,
          unitPrice: line.unitPrice,
          qty: line.qty,
          lineTotal: line.unitPrice * line.qty,
        }),
      ),
    ]);
  } catch (cause) {
    throw friendlyError(cause);
  }

  return {
    id,
    orderNo,
    subtotal,
    tax,
    total,
    paymentMethod: payment.method,
    tendered: payment.tendered,
    change: payment.change,
  };
}

/** An order row plus the item counts the history table shows. */
export type OrderSummary = Order & {
  /** Distinct product lines on the order. */
  itemCount: number;
  /** Total units sold. */
  unitCount: number;
};

export type OrderFilter = {
  /** Matches the order number, e.g. `POS-20261022`. */
  search?: string;
  status?: OrderStatus | "all";
  limit?: number;
};

export type OrderWithItems = {
  order: Order;
  items: OrderItem[];
};

/** Orders newest first, optionally filtered by status and order number. */
export async function listOrders({
  search = "",
  status = "all",
  limit = 200,
}: OrderFilter = {}): Promise<OrderSummary[]> {
  const term = search.trim();
  const conditions = [
    status === "all" ? undefined : eq(orders.status, status),
    term ? like(orders.orderNo, `%${term}%`) : undefined,
  ];

  const rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];

  const counts = await db
    .select({
      orderId: orderItems.orderId,
      itemCount: sql<number>`count(${orderItems.id})`,
      unitCount: sql<number>`coalesce(sum(${orderItems.qty}), 0)`,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids))
    .groupBy(orderItems.orderId);

  const byOrder = new Map(counts.map((row) => [row.orderId, row]));

  return rows.map((row) => {
    const count = byOrder.get(row.id);
    return {
      ...row,
      itemCount: count?.itemCount ?? 0,
      unitCount: count?.unitCount ?? 0,
    };
  });
}

/** One order with its item snapshots. */
export async function getOrder(
  id: string,
): Promise<OrderWithItems | undefined> {
  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return undefined;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(orderItems.id);

  return { order, items };
}

/**
 * Mark an order as void. The order and its items are kept — a void is an
 * audit record, not a deletion.
 */
export async function voidOrder(id: string): Promise<void> {
  try {
    await db
      .update(orders)
      .set({ status: "void", voidedAt: sql`(unixepoch() * 1000)` })
      .where(eq(orders.id, id));
  } catch (cause) {
    throw friendlyError(cause);
  }
}

/** Remove an order and its items (cascade). */
export async function deleteOrder(id: string): Promise<void> {
  try {
    await db.delete(orders).where(eq(orders.id, id));
  } catch (cause) {
    throw friendlyError(cause);
  }
}

/** What is in the till for the local day. */
export type CashSummary = {
  /** Cash taken in, less the change given back. */
  inDrawer: number;
  /** Cash sales completed today. */
  sales: number;
};

/**
 * The cash the drawer should hold: everything that was handed in, less every
 * change that went back out, across today's completed cash sales.
 *
 * `created_at` is UTC epoch milliseconds, so the day boundary is the local
 * midnight rather than a UTC one — the till counts the shift, not the clock.
 */
export async function getCashSummary(now = new Date()): Promise<CashSummary> {
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const row = await db
    .select({
      sales: sql<number>`count(${orders.id})`,
      inDrawer: sql<number>`coalesce(sum(${orders.tendered} - ${orders.changeGiven}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "completed"),
        eq(orders.paymentMethod, "cash"),
        gte(orders.createdAt, startOfDay),
      ),
    )
    .get();

  return {
    sales: Number(row?.sales ?? 0),
    inDrawer: Number(row?.inDrawer ?? 0),
  };
}
