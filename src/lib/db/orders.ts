import { desc, like } from "drizzle-orm";
import type { CartLine } from "$lib/stores/cart.svelte";
import type { VatRate } from "$lib/utils";
import { db } from "./client";
import { orderItems, orders } from "./schema";

export type PaymentMethod = "cash" | "card";

export type CheckoutInput = {
  lines: CartLine[];
  vatRate: VatRate;
  paymentMethod?: PaymentMethod;
};

export type CheckoutResult = {
  id: string;
  orderNo: string;
  subtotal: number;
  tax: number;
  total: number;
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
 */
export async function createOrder({
  lines,
  vatRate,
  paymentMethod = "cash",
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

  await db.batch([
    db.insert(orders).values({
      id,
      orderNo,
      subtotal,
      taxRate: vatRate,
      tax,
      total,
      paymentMethod,
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

  return { id, orderNo, subtotal, tax, total };
}
