import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "./client";
import { errorMessage } from "$lib/utils";
import {
  products,
  productInputSchema,
  type Product,
  type ProductInput,
} from "./schema";

export type ProductFilter = {
  /** Matches name, SKU or category (case-insensitive for ASCII). */
  search?: string;
  category?: string | null;
};

/** Active catalog items, alphabetically. */
export async function listProducts({
  search = "",
  category = null,
}: ProductFilter = {}): Promise<Product[]> {
  const term = search.trim();
  const match = term
    ? or(
        like(products.name, `%${term}%`),
        like(products.sku, `%${term}%`),
        like(products.category, `%${term}%`),
      )
    : undefined;
  const inCategory = category ? eq(products.category, category) : undefined;

  return db
    .select()
    .from(products)
    .where(and(eq(products.active, true), match, inCategory))
    .orderBy(asc(products.name));
}

export async function getProduct(id: number): Promise<Product | undefined> {
  return db.select().from(products).where(eq(products.id, id)).get();
}

/** Readable messages for the two failures a cashier can actually cause. */
function friendlyError(error: unknown): Error {
  const message = errorMessage(error);

  if (/UNIQUE constraint failed: (products\.sku|index 'products_sku_idx')/i.test(message)) {
    return new Error("That SKU is already used by another product.");
  }

  return new Error(message);
}

/** Only the fields the form owns; `imageUrl` and `active` are preserved on edit. */
function toValues(input: ProductInput) {
  return {
    name: input.name,
    price: input.price,
    category: input.category,
    sku: input.sku ?? null,
  };
}

export async function createProduct(input: ProductInput): Promise<void> {
  const parsed = productInputSchema.parse(input);

  try {
    await db.insert(products).values(toValues(parsed));
  } catch (cause) {
    throw friendlyError(cause);
  }
}

export async function updateProduct(
  id: number,
  input: ProductInput,
): Promise<void> {
  const parsed = productInputSchema.parse(input);

  try {
    await db
      .update(products)
      .set({
        ...toValues(parsed),
        updatedAt: sql`(unixepoch() * 1000)`,
      })
      .where(eq(products.id, id));
  } catch (cause) {
    throw friendlyError(cause);
  }
}

/** Past orders keep their item snapshots; `order_items.product_id` is set null. */
export async function deleteProduct(id: number): Promise<void> {
  await db.delete(products).where(eq(products.id, id));
}
