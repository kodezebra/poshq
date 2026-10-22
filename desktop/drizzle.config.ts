import { defineConfig } from "drizzle-kit";

/**
 * The Rust side embeds these SQL files at compile time and applies them
 * against `PRAGMA user_version`, so the generated files are committed.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./src-tauri/migrations",
  strict: true,
  verbose: true,
});
