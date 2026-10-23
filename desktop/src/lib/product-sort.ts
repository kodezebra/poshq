import type { TableSort } from "$lib/components/table/types";
import type { Product } from "$lib/db/schema";

/**
 * Order the loaded catalog for the list and grid views.
 *
 * `listProducts` already returns names alphabetically, so the default sort is
 * the fetch's own order and re-sorting costs no round trip. Ties fall back to
 * the name so a price or category sort never reshuffles equal rows between
 * renders.
 */
export function sortProducts(
  rows: Product[],
  sort: TableSort | null,
): Product[] {
  const factor = sort?.direction === "desc" ? -1 : 1;
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);

  return [...rows].sort((a, b) => {
    switch (sort?.key) {
      case "price":
        return (a.price - b.price) * factor || byName(a, b);
      case "category":
        return a.category.localeCompare(b.category) * factor || byName(a, b);
      case "name":
      default:
        return byName(a, b) * factor;
    }
  });
}
