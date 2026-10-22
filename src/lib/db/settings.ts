import { eq } from "drizzle-orm";
import { DEFAULT_VAT_RATE, VAT_RATES, type VatRate } from "$lib/utils";
import { db } from "./client";
import { settings } from "./schema";

const VAT_KEY = "vat_rate";

export function isVatRate(value: number): value is VatRate {
  return (VAT_RATES as readonly number[]).includes(value);
}

/** The register's VAT rate, falling back to the seeded default. */
export async function getVatRate(): Promise<VatRate> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.key, VAT_KEY))
    .get();

  const rate = Number(row?.value);
  return isVatRate(rate) ? rate : DEFAULT_VAT_RATE;
}

export async function setVatRate(rate: VatRate): Promise<void> {
  await db
    .insert(settings)
    .values({ key: VAT_KEY, value: String(rate) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: String(rate) },
    });
}
