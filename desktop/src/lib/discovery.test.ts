import { afterEach, describe, expect, it } from "vitest";
import { discoverTills, hasBridge } from "./discovery";

const internals = globalThis as {
  __TAURI_INTERNALS__?: { invoke?: unknown };
};

afterEach(() => {
  delete internals.__TAURI_INTERNALS__;
});

describe("main till discovery", () => {
  it("only searches from inside the desktop shell", async () => {
    expect(hasBridge()).toBe(false);
    await expect(discoverTills()).resolves.toEqual([]);
  });

  it("detects the shell bridge", () => {
    internals.__TAURI_INTERNALS__ = { invoke: () => {} };
    expect(hasBridge()).toBe(true);
  });
});
