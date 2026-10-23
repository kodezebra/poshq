import { normalizeTillCode } from "$lib/connection";

function dayStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * `POS-YYYYMMDD-T1-`, sequential within the local day for that till. Putting
 * the till in the number keeps two tills from producing the same identifier
 * for different sales.
 */
export function orderNoPrefix(tillCode: string, date = new Date()): string {
  const code = normalizeTillCode(tillCode);
  if (!code) throw new Error("This till needs a short code, like T1.");
  return `POS-${dayStamp(date)}-${code}-`;
}

export function formatOrderNo(
  tillCode: string,
  sequence: number,
  date = new Date(),
): string {
  return `${orderNoPrefix(tillCode, date)}${String(sequence).padStart(4, "0")}`;
}

/** The next number after the last matching order, starting again at 1. */
export function sequenceAfter(
  lastOrderNo: string | null | undefined,
  prefix: string,
): number {
  if (!lastOrderNo?.startsWith(prefix)) return 1;
  const parsed = Number(lastOrderNo.slice(prefix.length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed + 1 : 1;
}
