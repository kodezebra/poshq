import { describe, expect, it } from "vitest";
import { formatOrderNo, orderNoPrefix, sequenceAfter } from "./order-number";

const day = new Date(2026, 9, 23);

describe("order numbers", () => {
  it("puts the till code before the sequence", () => {
    expect(orderNoPrefix("T1", day)).toBe("POS-20261023-T1-");
    expect(formatOrderNo("T2", 7, day)).toBe("POS-20261023-T2-0007");
  });

  it("normalises a code before using it", () => {
    expect(formatOrderNo(" t-1 ", 12, day)).toBe("POS-20261023-T1-0012");
  });

  it("refuses a till with no code", () => {
    expect(() => orderNoPrefix("---")).toThrow(/short code/);
  });

  it("continues the count within the same till and day", () => {
    const prefix = orderNoPrefix("T1", day);
    expect(sequenceAfter(undefined, prefix)).toBe(1);
    expect(sequenceAfter(null, prefix)).toBe(1);
    expect(sequenceAfter(`${prefix}0007`, prefix)).toBe(8);
  });

  it("starts again for a different prefix", () => {
    const prefix = orderNoPrefix("T1", day);
    expect(sequenceAfter("POS-20261023-T2-0007", prefix)).toBe(1);
    expect(sequenceAfter(`${prefix}not-a-number`, prefix)).toBe(1);
  });
});
