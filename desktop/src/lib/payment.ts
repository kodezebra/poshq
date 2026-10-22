/**
 * Cash handling for the till.
 *
 * Every amount is whole Ugandan shillings — UGX has no minor unit, so the
 * arithmetic here is integer arithmetic throughout. The module is pure on
 * purpose: the till, the checkout and the order history all have to agree on
 * what was handed over and what change was given back, and one shared set of
 * rules is the only way to keep them from drifting apart.
 */

export type PaymentMethod = "cash" | "card";

/**
 * Notes a customer is likely to hand over, smallest first. These are the
 * denominations in circulation — the quick buttons offer the ones that cover
 * the sale.
 */
export const CASH_NOTES = [1000, 2000, 5000, 10000, 20000, 50000] as const;

/** How many quick-cash buttons the till offers at once. */
export const QUICK_CASH_LIMIT = 3;

/**
 * Change still owed to the customer. Never negative — a sale that is short is
 * short, not a change of minus two thousand.
 */
export function changeDue(total: number, tendered: number): number {
  return Math.max(0, tendered - total);
}

/**
 * How much the customer still owes. Never negative — once the sale is covered
 * there is nothing left to pay.
 */
export function shortfall(total: number, tendered: number): number {
  return Math.max(0, total - tendered);
}

/**
 * The notes a customer could hand over for this total, smallest first: the
 * exact note first, then the next ones up. An empty list means no single
 * note covers the sale and the amount has to be typed in.
 */
export function quickCash(
  total: number,
  limit = QUICK_CASH_LIMIT,
): number[] {
  if (total <= 0) return [];
  return CASH_NOTES.filter((note) => note >= total).slice(0, limit);
}

/** How a sale was paid for. */
export type Settlement = {
  method: PaymentMethod;
  /** What was handed over. A card is always settled at the exact total. */
  tendered: number;
  /** Change given back from the till. Always zero for a card. */
  change: number;
};

/**
 * Work out how a payment is settled.
 *
 * Cash must cover the sale — a short payment is refused here rather than
 * being discovered later in the drawer. A card is settled at the exact total
 * because the till never holds the money and never gives change.
 *
 * @throws when a cash payment does not cover the total.
 */
export function settle(
  total: number,
  method: PaymentMethod,
  tendered: number,
): Settlement {
  if (method === "card") {
    return { method, tendered: total, change: 0 };
  }

  if (tendered < total) {
    throw new Error("The customer has not paid enough yet.");
  }

  return { method, tendered, change: tendered - total };
}
