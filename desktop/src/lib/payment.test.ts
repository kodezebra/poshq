import { describe, expect, it } from "vitest";
import {
  CASH_NOTES,
  changeDue,
  quickCash,
  settle,
  shortfall,
} from "./payment";

describe("changeDue", () => {
  it("is the difference when the customer overpays", () => {
    expect(changeDue(1770, 2000)).toBe(230);
  });

  it("is zero when the customer pays exactly", () => {
    expect(changeDue(1770, 1770)).toBe(0);
  });

  it("never goes negative when the sale is short", () => {
    expect(changeDue(1770, 1000)).toBe(0);
  });
});

describe("shortfall", () => {
  it("is what is still owed", () => {
    expect(shortfall(1770, 1000)).toBe(770);
  });

  it("is zero once the sale is covered", () => {
    expect(shortfall(1770, 2000)).toBe(0);
    expect(shortfall(1770, 1770)).toBe(0);
  });

  it("never goes negative", () => {
    expect(shortfall(1770, 5000)).toBe(0);
  });
});

describe("quickCash", () => {
  it("offers the notes that cover the total, smallest first", () => {
    expect(quickCash(1770)).toEqual([2000, 5000, 10000]);
  });

  it("offers the exact note first when one fits", () => {
    expect(quickCash(1000)).toEqual([1000, 2000, 5000]);
  });

  it("offers nothing when no single note is enough", () => {
    expect(quickCash(60000)).toEqual([]);
  });

  it("offers nothing for a sale that is not there", () => {
    expect(quickCash(0)).toEqual([]);
  });

  it("only ever offers denominations in circulation", () => {
    for (const note of quickCash(3500)) {
      expect(CASH_NOTES).toContain(note);
    }
  });
});

describe("settle", () => {
  it("settles cash that covers the sale", () => {
    expect(settle(1770, "cash", 2000)).toEqual({
      method: "cash",
      tendered: 2000,
      change: 230,
    });
  });

  it("settles exact cash with no change", () => {
    expect(settle(1770, "cash", 1770)).toEqual({
      method: "cash",
      tendered: 1770,
      change: 0,
    });
  });

  it("refuses a cash payment that does not cover the sale", () => {
    expect(() => settle(1770, "cash", 1000)).toThrow(
      "The customer has not paid enough yet.",
    );
  });

  it("settles a card at the exact total, whatever was typed", () => {
    expect(settle(1770, "card", 0)).toEqual({
      method: "card",
      tendered: 1770,
      change: 0,
    });
    expect(settle(1770, "card", 5000)).toEqual({
      method: "card",
      tendered: 1770,
      change: 0,
    });
  });

  it("never gives change on a card payment", () => {
    expect(settle(1770, "card", 5000).change).toBe(0);
  });
});
