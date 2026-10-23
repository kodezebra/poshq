import { describe, expect, it } from "vitest";
import { sortOrders } from "./order-sort";
import type { OrderSummary } from "./db/orders";

function order(overrides: Partial<OrderSummary> & { id: string }): OrderSummary {
  return {
    orderNo: `POS-${overrides.id}`,
    tillName: null,
    status: "completed",
    subtotal: 0,
    taxRate: 0,
    tax: 0,
    total: 0,
    paymentMethod: "cash",
    tendered: 0,
    changeGiven: 0,
    createdAt: 0,
    voidedAt: null,
    itemCount: 1,
    unitCount: 1,
    ...overrides,
  };
}

const orders = [
  order({ id: "a", orderNo: "POS-0002", total: 500, unitCount: 1, createdAt: 200 }),
  order({ id: "b", orderNo: "POS-0001", total: 9000, unitCount: 3, createdAt: 100 }),
  order({ id: "c", orderNo: "POS-0003", total: 300, unitCount: 2, createdAt: 300 }),
];

const ids = (rows: OrderSummary[]) => rows.map((row) => row.id);

describe("sortOrders", () => {
  it("lists the newest sale first by default", () => {
    expect(ids(sortOrders(orders, { key: "date", direction: "desc" }))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("orders money by value, not by string", () => {
    expect(ids(sortOrders(orders, { key: "total", direction: "asc" }))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("orders counts separately from money", () => {
    expect(ids(sortOrders(orders, { key: "items", direction: "desc" }))).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("orders order numbers as text", () => {
    expect(ids(sortOrders(orders, { key: "order", direction: "asc" }))).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("falls back to date for an unknown key", () => {
    expect(ids(sortOrders(orders, { key: "payment", direction: "asc" }))).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("treats a missing date as the oldest sale", () => {
    const undated = order({ id: "z", createdAt: undefined });

    expect(
      ids(sortOrders([...orders, undated], { key: "date", direction: "desc" })),
    ).toEqual(["c", "a", "b", "z"]);
  });

  it("leaves the incoming rows untouched", () => {
    const before = ids(orders);
    sortOrders(orders, { key: "total", direction: "asc" });
    expect(ids(orders)).toEqual(before);
  });
});
