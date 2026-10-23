import { describe, expect, it } from "vitest";
import type { Product } from "./db/schema";
import { sortProducts } from "./product-sort";

function product(
  name: string,
  price: number,
  category: string,
  sku: string | null = null,
): Product {
  return {
    id: price,
    name,
    sku,
    price,
    category,
    imageUrl: null,
    active: true,
    createdAt: 0,
    updatedAt: 0,
  };
}

const rows = [
  product("Banana", 500, "Grocery", "BAN-01"),
  product("Cola", 2000, "Drinks", "COL-01"),
  product("Bread", 3500, "Grocery"),
  product("Apple", 2000, "Grocery", "APP-01"),
];

const names = (result: Product[]) => result.map((row) => row.name);

describe("sortProducts", () => {
  it("sorts by name ascending by default", () => {
    expect(names(sortProducts(rows, null))).toEqual([
      "Apple",
      "Banana",
      "Bread",
      "Cola",
    ]);
    expect(names(sortProducts(rows, { key: "name", direction: "asc" }))).toEqual(
      ["Apple", "Banana", "Bread", "Cola"],
    );
  });

  it("reverses names when asked", () => {
    expect(names(sortProducts(rows, { key: "name", direction: "desc" }))).toEqual(
      ["Cola", "Bread", "Banana", "Apple"],
    );
  });

  it("sorts money by value, not by its formatted string", () => {
    expect(names(sortProducts(rows, { key: "price", direction: "asc" }))).toEqual(
      ["Banana", "Apple", "Cola", "Bread"],
    );
    expect(
      names(sortProducts(rows, { key: "price", direction: "desc" })),
    ).toEqual(["Bread", "Apple", "Cola", "Banana"]);
  });

  it("breaks price ties by name in both directions", () => {
    // Apple and Cola both cost 2,000: the name decides, whichever way the
    // column is sorted, so equal rows never swap between renders.
    const asc = names(sortProducts(rows, { key: "price", direction: "asc" }));
    const desc = names(sortProducts(rows, { key: "price", direction: "desc" }));

    expect(asc.indexOf("Apple")).toBeLessThan(asc.indexOf("Cola"));
    expect(desc.indexOf("Apple")).toBeLessThan(desc.indexOf("Cola"));
  });

  it("groups categories and breaks ties by name", () => {
    expect(
      names(sortProducts(rows, { key: "category", direction: "asc" })),
    ).toEqual(["Cola", "Apple", "Banana", "Bread"]);
  });

  it("leaves the caller's array untouched", () => {
    const input = [...rows];
    sortProducts(input, { key: "price", direction: "desc" });
    expect(names(input)).toEqual(["Banana", "Cola", "Bread", "Apple"]);
  });
});
