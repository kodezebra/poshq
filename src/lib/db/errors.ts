import { errorMessage } from "$lib/utils";

/**
 * SQLite reports constraint failures in its own vocabulary. Translate the ones
 * a cashier can actually cause into plain language, and let everything else
 * through unchanged.
 */
const RULES: Array<[RegExp, string]> = [
  [
    /UNIQUE constraint failed: (products\.sku|index 'products_sku_idx')/i,
    "That SKU is already used by another product.",
  ],
  [
    /UNIQUE constraint failed: (orders\.order_no|index 'orders_order_no_unique')/i,
    "That order number already exists.",
  ],
  [
    /UNIQUE constraint failed/i,
    "That value is already used by another record.",
  ],
  [
    /FOREIGN KEY constraint failed/i,
    "That record is still used somewhere else.",
  ],
  [
    /NOT NULL constraint failed/i,
    "Please fill in every required field.",
  ],
  [
    /CHECK constraint failed/i,
    "That value is not allowed.",
  ],
  [
    /no such table/i,
    "The register is not set up correctly.",
  ],
];

/** A database failure, worded for the person standing at the till. */
export function friendlyError(error: unknown): Error {
  const message = errorMessage(error);

  for (const [pattern, wording] of RULES) {
    if (pattern.test(message)) return new Error(wording);
  }

  return new Error(message);
}
