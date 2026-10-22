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
 * Bridge between Drizzle's `sqlite-proxy` driver and the Rust `db_*`
 * commands. Rust owns the file, transaction and value mapping.
 */
async function proxy(
  sql: string,
  params: unknown[],
  method: SqlMethod,
): Promise<{ rows: unknown[] }> {
  const response = await invoke<QueryResponse>("db_query", {
    request: { sql, params, method },
  });
  // Drizzle's `get` path checks the row for null before mapping it.
  return { rows: response.rows as unknown[] };
}

async function proxyBatch(
  batch: QueryRequest[],
): Promise<{ rows: unknown[] }[]> {
  const responses = await invoke<QueryResponse[]>("db_batch", { batch });
  return responses.map((response) => ({ rows: response.rows ?? [] }));
}

export const db = drizzle(proxy, proxyBatch, { schema });
