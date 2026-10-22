import { invoke } from "@tauri-apps/api/core";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export type SqlMethod = "run" | "all" | "get" | "values";

type QueryRequest = {
  sql: string;
  params: unknown[];
  method: SqlMethod;
};

type QueryResponse = {
  /** `null` only for a `get` that matched nothing. */
  rows: unknown[] | null;
};

/**
 * The Tauri shell injects `__TAURI_INTERNALS__.invoke`. A plain browser (for
 * example `bun run dev` on its own) has no bridge, and `invoke` would fail
 * with an opaque "cannot read properties of undefined" — say what is wrong.
 */
function requireBridge(): void {
  const internals = (
    globalThis as { __TAURI_INTERNALS__?: { invoke?: unknown } }
  ).__TAURI_INTERNALS__;

  if (!internals || typeof internals.invoke !== "function") {
    throw new Error(
      "Database unavailable: the POS must run inside its desktop shell. Start it with `bun run tauri dev`.",
    );
  }
}

/**
 * Bridge between Drizzle's `sqlite-proxy` driver and the Rust `db_*`
 * commands. Rust owns the file, transaction and value mapping.
 */
async function proxy(
  sql: string,
  params: unknown[],
  method: SqlMethod,
): Promise<{ rows: unknown[] }> {
  requireBridge();

  const response = await invoke<QueryResponse>("db_query", {
    request: { sql, params, method },
  });
  // Drizzle's `get` path checks the row for null before mapping it.
  return { rows: response.rows as unknown[] };
}

async function proxyBatch(
  batch: QueryRequest[],
): Promise<{ rows: unknown[] }[]> {
  requireBridge();

  const responses = await invoke<QueryResponse[]>("db_batch", { batch });
  return responses.map((response) => ({ rows: response.rows ?? [] }));
}

export const db = drizzle(proxy, proxyBatch, { schema });
