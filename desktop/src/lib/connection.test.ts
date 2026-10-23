import { describe, expect, it } from "vitest";
import {
  createToken,
  isValidTillCode,
  normalizeServerUrl,
  normalizeTillCode,
  serverUrlFrom,
} from "./connection";

describe("till codes", () => {
  it("keeps only four safe characters", () => {
    expect(normalizeTillCode(" t-1 ")).toBe("T1");
    expect(normalizeTillCode("front counter")).toBe("FRON");
    expect(normalizeTillCode("---")).toBe("");
  });

  it("rejects an empty code", () => {
    expect(isValidTillCode("T1")).toBe(true);
    expect(isValidTillCode(" t 2 ")).toBe(false);
    expect(isValidTillCode("TOOLONG")).toBe(false);
    expect(isValidTillCode("---")).toBe(false);
  });
});

describe("main till address", () => {
  it("adds the scheme and Posh's port", () => {
    expect(normalizeServerUrl("192.168.1.5")).toBe(
      "http://192.168.1.5:47821",
    );
    expect(normalizeServerUrl("192.168.1.5:47821/")).toBe(
      "http://192.168.1.5:47821",
    );
  });

  it("keeps an explicit port", () => {
    expect(normalizeServerUrl("http://main.local:5000/pos/")).toBe(
      "http://main.local:5000/pos",
    );
  });

  it("supports a bracketed IPv6 address", () => {
    expect(normalizeServerUrl("http://[::1]")).toBe("http://[::1]:47821");
    expect(serverUrlFrom("::1", 47821)).toBe("http://[::1]:47821");
  });

  it("rejects an empty or non-http address", () => {
    expect(() => normalizeServerUrl(" ")).toThrow(/address/);
    expect(() => normalizeServerUrl("ftp://main.local")).toThrow(/http/);
  });
});

describe("till token", () => {
  it("is long enough to satisfy the server", () => {
    const token = createToken();
    expect(token).toMatch(/^[A-F0-9]{12}$/);
    expect(createToken()).not.toBe(token);
  });
});
