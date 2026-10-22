import { describe, expect, it } from "vitest";
import type { Product } from "$lib/db/schema";
import { Cart } from "./cart.svelte";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Samosa",
    sku: "SAM-001",
    price: 500,
    category: "Snacks",
    imageUrl: null,
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("cart", () => {
  it("starts empty", () => {
    const cart = new Cart();

    expect(cart.isEmpty).toBe(true);
    expect(cart.count).toBe(0);
    expect(cart.subtotal).toBe(0);
    expect(cart.tax).toBe(0);
    expect(cart.total).toBe(0);
  });

  it("adds a product once", () => {
    const cart = new Cart();
    cart.add(product());

    expect(cart.count).toBe(1);
    expect(cart.subtotal).toBe(500);
    expect(cart.lines[0]).toMatchObject({
      productId: 1,
      name: "Samosa",
      unitPrice: 500,
      qty: 1,
    });
  });

  it("merges a repeat of the same product into one line", () => {
    const cart = new Cart();
    cart.add(product());
    cart.add(product());

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qty).toBe(2);
    expect(cart.count).toBe(2);
    expect(cart.subtotal).toBe(1000);
  });

  it("keeps separate lines for different products", () => {
    const cart = new Cart();
    cart.add(product());
    cart.add(product({ id: 2, name: "Bottled Water", price: 1000 }));

    expect(cart.lines).toHaveLength(2);
    expect(cart.subtotal).toBe(1500);
  });

  it("snapshots the price at the moment of adding", () => {
    const cart = new Cart();
    cart.add(product({ price: 500 }));
    cart.add(product({ id: 2, name: "Samosa", price: 900 }));

    expect(cart.lines.map((line) => line.unitPrice)).toEqual([500, 900]);
  });

  it("never adds fewer than one", () => {
    const cart = new Cart();
    cart.add(product(), 0);
    cart.add(product(), -3);

    expect(cart.count).toBe(2);
  });

  it("changes a quantity in place", () => {
    const cart = new Cart();
    cart.add(product());
    cart.setQty(1, 4);

    expect(cart.lines[0].qty).toBe(4);
    expect(cart.subtotal).toBe(2000);
  });

  it("removes a line when the quantity drops to zero or below", () => {
    const cart = new Cart();
    cart.add(product());
    cart.setQty(1, 0);

    expect(cart.lines).toHaveLength(0);
    expect(cart.isEmpty).toBe(true);

    cart.add(product());
    cart.setQty(1, -1);

    expect(cart.lines).toHaveLength(0);
  });

  it("clears every line", () => {
    const cart = new Cart();
    cart.add(product());
    cart.add(product({ id: 2 }));
    cart.clear();

    expect(cart.lines).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
  });
});

describe("cart totals", () => {
  it("charges 18% VAT by default", () => {
    const cart = new Cart();
    cart.add(product({ price: 2000 }));

    expect(cart.vatRate).toBe(18);
    expect(cart.subtotal).toBe(2000);
    expect(cart.tax).toBe(360);
    expect(cart.total).toBe(2360);
  });

  it("charges no VAT at 0%", () => {
    const cart = new Cart();
    cart.setVatRate(0);
    cart.add(product({ price: 2000 }));

    expect(cart.subtotal).toBe(2000);
    expect(cart.tax).toBe(0);
    expect(cart.total).toBe(2000);
  });

  it("rounds the tax to the nearest shilling", () => {
    const cart = new Cart();
    cart.add(product({ price: 999 }));

    // 999 * 18 / 100 = 179.82 -> 180
    expect(cart.tax).toBe(180);
    expect(cart.total).toBe(1179);
  });

  it("adds tax on top of the subtotal", () => {
    const cart = new Cart();
    cart.add(product({ price: 500 }));
    cart.add(product({ id: 2, name: "Bottled Water", price: 1000 }));

    expect(cart.subtotal).toBe(1500);
    expect(cart.tax).toBe(270);
    expect(cart.total).toBe(1770);
  });

  it("re-reads the totals after the VAT rate changes", () => {
    const cart = new Cart();
    cart.add(product({ price: 2000 }));

    expect(cart.total).toBe(2360);

    cart.setVatRate(0);
    expect(cart.tax).toBe(0);
    expect(cart.total).toBe(2000);
  });
});
