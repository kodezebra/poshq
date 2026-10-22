import { and, asc, eq, like, or } from "drizzle-orm";
import { db } from "./client";
import { products, type Product } from "./schema";

export type ProductFilter = {
  /** Matches name, SKU or category (case-insensitive for ASCII). */
  search?: string;
};

/** Active catalog items, alphabetically. */
export async function listProducts({
  search = "",
}: ProductFilter = {}): Promise<Product[]> {
  const term = search.trim();
  const match = term
    ? or(
        like(products.name, `%${term}%`),
        like(products.sku, `%${term}%`),
        like(products.category, `%${term}%`),
      )
    : undefined;

  return db
    .select()
    .from(products)
    .where(and(eq(products.active, true), match))
    .orderBy(asc(products.name));
}

export async function getProduct(id: number): Promise<Product | undefined> {
  return db.select().from(products).where(eq(products.id, id)).get();
}
