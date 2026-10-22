import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes, removing conflicts and ensuring proper ordering.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** VAT is a whole percentage; the register only trades at 0% or 18%. */
export const VAT_RATES = [0, 18] as const
export type VatRate = (typeof VAT_RATES)[number]
export const DEFAULT_VAT_RATE: VatRate = 18

const ugx = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Format whole Ugandan shillings. UGX has no minor unit, so values are
 * rounded to the nearest shilling before display.
 */
export function formatUGX(amount: number): string {
  return ugx.format(Math.round(amount))
}

/**
 * Read a shilling amount from free text: accepts `5,000`, `UGX 5000` and
 * pasted currency strings. Returns 0 when there are no digits.
 */
export function parseUGX(input: string): number {
  const digits = input.replace(/[^\d]/g, "")
  if (!digits) return 0

  const value = Number.parseInt(digits, 10)
  return Number.isSafeInteger(value) ? value : 0
}

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Drizzle's own wrapper puts the generated SQL in the error message. */
const DRIZZLE_QUERY_DUMP = /^failed query:/i

/** A statement that reached the UI through some other path. */
const SQL_STATEMENT =
  /^\s*(select|insert\s+into|replace\s+into|update|delete\s+from)\b[\s\S]*"[^"]*"/i

const GENERIC_DATABASE_ERROR =
  "The database refused that request. Please try again."

/** Query text is for the developer console, never for a cashier. */
function withoutSql(message: string): string {
  return DRIZZLE_QUERY_DUMP.test(message) || SQL_STATEMENT.test(message)
    ? GENERIC_DATABASE_ERROR
    : message
}

/**
 * Normalise an unknown failure for display. Tauri rejects commands with the
 * string returned by Rust, while Drizzle wraps driver failures in an error
 * whose message is the generated SQL — so walk to the root cause and never
 * show a cashier the query text.
 */
export function errorMessage(error: unknown): string {
  let current: unknown = error
  const seen = new Set<unknown>()

  while (
    current &&
    typeof current === "object" &&
    "cause" in current &&
    (current as { cause?: unknown }).cause &&
    !seen.has(current)
  ) {
    seen.add(current)
    current = (current as { cause?: unknown }).cause
  }

  if (current instanceof Error) return withoutSql(current.message)
  return withoutSql(typeof current === "string" ? current : String(current))
}
