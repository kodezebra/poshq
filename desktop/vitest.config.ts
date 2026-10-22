import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

/**
 * The POS ships as a Tauri desktop shell, so the unit tests cover the pure
 * logic a cashier's arithmetic depends on: money formatting, tax maths and
 * the cart. Anything that needs a database or a window is exercised by the
 * browser QA pass instead.
 *
 * The SvelteKit plugin gives the tests the same `$lib` alias the app uses and
 * compiles the rune-based stores (`.svelte.ts`) that run outside a component.
 */
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
