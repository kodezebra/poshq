import { describe, expect, it } from "vitest";
import { buttonVariants } from "./components/button/variants";
import { cn } from "./utils";

/**
 * `--text-*` tokens and `text-*` colours share a prefix in Tailwind v4. These
 * tests pin the merger's ability to keep both: losing the colour is how a
 * primary button ended up with black text on ultramarine.
 */
describe("Instrument class merging", () => {
  it("keeps a filled button's ink and its size", () => {
    const classes = buttonVariants({ variant: "primary", size: "md" });

    expect(classes).toContain("text-on-primary");
    expect(classes).toContain("text-button-md");
  });

  it("keeps the ink on every filled variant", () => {
    for (const variant of ["primary", "danger"] as const) {
      expect(buttonVariants({ variant })).toContain("text-on-primary");
    }

    expect(buttonVariants({ variant: "dark" })).toContain("text-chrome-ink");
    expect(buttonVariants({ variant: "secondary" })).toContain(
      "text-ink-secondary",
    );
    expect(buttonVariants({ variant: "ghost" })).toContain("text-ink-secondary");
  });

  it("keeps a size and a colour on the same element", () => {
    expect(cn("text-caption text-ink-mute")).toBe("text-caption text-ink-mute");
    expect(cn("text-display-lg text-ink")).toBe("text-display-lg text-ink");
    expect(cn("text-on-primary text-button-md")).toBe(
      "text-on-primary text-button-md",
    );
  });

  it("still resolves genuine conflicts to the last class", () => {
    expect(cn("text-caption text-body-md")).toBe("text-body-md");
    expect(cn("text-ink text-primary")).toBe("text-primary");
  });

  it("lets a caller override the button ink without losing its size", () => {
    const classes = cn(buttonVariants({ variant: "primary" }), "text-chrome-ink");

    expect(classes).toContain("text-chrome-ink");
    expect(classes).not.toContain("text-on-primary");
    expect(classes).toContain("text-button-md");
  });
});
