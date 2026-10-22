import type { TableSort } from "$lib/components/table/types";
import type { OrderSummary } from "$lib/db/orders";

/**
 * Order a loaded page of orders for the list view.
 *
 * The view fetches the whole filtered set, so ordering belongs here rather
 * than in SQL: re-sorting is instant and never costs a round trip. Unknown
 * keys fall back to date, which is what the fetch itself orders by.
 */
export function sortOrders(
  rows: OrderSummary[],
  sort: TableSort | null,
): OrderSummary[] {
  const factor = sort?.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    switch (sort?.key) {
      case "total":
        return (a.total - b.total) * factor;
      case "items":
        return (a.unitCount - b.unitCount) * factor;
      case "order":
        return a.orderNo.localeCompare(b.orderNo) * factor;
      default:
        return ((a.createdAt ?? 0) - (b.createdAt ?? 0)) * factor;
    }
  });
}
