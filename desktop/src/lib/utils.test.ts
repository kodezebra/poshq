import { describe, expect, it } from "vitest";
import {
  DEFAULT_VAT_RATE,
  errorMessage,
  formatUGX,
  parseUGX,
  VAT_RATES,
} from "./utils";

/** `Intl` separates the amount from "USh" with a non-breaking space. */
const NBSP = " ";

describe("formatUGX", () => {
  it("renders whole shillings with the Ugandan shilling sign", () => {
    expect(formatUGX(500)).toBe(`USh${NBSP}500`);
    expect(formatUGX(3500)).toBe(`USh${NBSP}3,500`);
    expect(formatUGX(1234567)).toBe(`USh${NBSP}1,234,567`);
  });

  it("never shows decimals, because UGX has no minor unit", () => {
    expect(formatUGX(1500.4)).toBe(`USh${NBSP}1,500`);
    expect(formatUGX(1500.6)).toBe(`USh${NBSP}1,501`);
  });

  it("renders zero", () => {
    expect(formatUGX(0)).toBe(`USh${NBSP}0`);
  });
});

describe("parseUGX", () => {
  it("reads plain numbers", () => {
    expect(parseUGX("500")).toBe(500);
    expect(parseUGX(" 500 ")).toBe(500);
  });

  it("ignores the separators people type or paste", () => {
    expect(parseUGX("5,000")).toBe(5000);
    expect(parseUGX("1 000")).toBe(1000);
    expect(parseUGX("UGX 5000")).toBe(5000);
    expect(parseUGX("USh 2,360")).toBe(2360);
  });

  it("falls back to zero when there are no digits", () => {
    expect(parseUGX("")).toBe(0);
    expect(parseUGX("free")).toBe(0);
  });

  it("keeps only the digits of a signed amount", () => {
    expect(parseUGX("-500")).toBe(500);
  });

  it("round-trips a formatted amount", () => {
    expect(parseUGX(formatUGX(2360))).toBe(2360);
  });
});

describe("VAT rates", () => {
  it("trades at 0% or 18% only", () => {
    expect([...VAT_RATES]).toEqual([0, 18]);
    expect(DEFAULT_VAT_RATE).toBe(18);
  });
});

describe("errorMessage", () => {
  it("returns the message of a plain error", () => {
    expect(errorMessage(new Error("Cart is empty"))).toBe("Cart is empty");
  });

  it("returns a thrown string as-is", () => {
    expect(errorMessage("UNIQUE constraint failed: products.sku")).toBe(
      "UNIQUE constraint failed: products.sku",
    );
  });

  it("walks to the root cause of a wrapped failure", () => {
    const cause = new Error("UNIQUE constraint failed: products.sku");
    const wrapper = new Error("Failed query: insert into products", { cause });

    expect(errorMessage(wrapper)).toBe(
      "UNIQUE constraint failed: products.sku",
    );
  });

  it("never shows the generated SQL to a cashier", () => {
    const dump = new Error(
      'Failed query: insert into "products" ("name","price") values (?, ?)',
    );

    expect(errorMessage(dump)).toBe(
      "The database refused that request. Please try again.",
    );
    expect(errorMessage(dump)).not.toMatch(/insert into/i);
  });

  it("never shows a raw statement that reached the UI", () => {
    const statement = new Error(
      'insert into "products" ("name") values (?) : UNIQUE constraint failed',
    );

    expect(errorMessage(statement)).toBe(
      "The database refused that request. Please try again.",
    );
  });

  it("leaves ordinary wording alone", () => {
    expect(errorMessage(new Error("Could not update the price"))).toBe(
      "Could not update the price",
    );
  });
});
