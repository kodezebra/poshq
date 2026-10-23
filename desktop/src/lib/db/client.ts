import { invoke } from "@tauri-apps/api/core";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import {
  apiUrl,
  getConnection,
  TOKEN_HEADER,
  type ConnectionConfig,
} from "$lib/connection";
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

const REQUEST_TIMEOUT_MS = 10_000;

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

function configured(): ConnectionConfig {
  const config = getConnection();
  if (!config) {
    throw new Error("This till is not set up yet. Choose main till or client till.");
  }
  return config;
}

async function post<T>(
  config: ConnectionConfig,
  path: string,
  body: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl(config, path), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [TOKEN_HEADER]: config.token,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `The main till answered with status ${response.status}.`;
      try {
        const payload = (await response.json()) as { error?: unknown };
        if (typeof payload.error === "string") message = payload.error;
      } catch {
        // The status is still more useful than a JSON parse failure.
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The main till did not answer in time. Check that it is on and on the same network.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the main till. Sales are paused until the connection returns.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bridge between Drizzle's `sqlite-proxy` driver and the owner of the
 * database. The main till calls Rust directly; a client sends the same
 * request to the main till over the LAN.
 */
async function proxy(
  sql: string,
  params: unknown[],
  method: SqlMethod,
): Promise<{ rows: unknown[] }> {
  const config = configured();

  if (config.role === "main") {
    requireBridge();
    const response = await invoke<QueryResponse>("db_query", {
      request: { sql, params, method },
    });
    // Drizzle's `get` path checks the row for null before mapping it.
    return { rows: response.rows as unknown[] };
  }

  const response = await post<QueryResponse>(config, "/api/db/query", {
    sql,
    params,
    method,
  });
  return { rows: response.rows as unknown[] };
}

async function proxyBatch(
  batch: QueryRequest[],
): Promise<{ rows: unknown[] }[]> {
  const config = configured();

  if (config.role === "main") {
    requireBridge();
    const responses = await invoke<QueryResponse[]>("db_batch", { batch });
    return responses.map((response) => ({ rows: response.rows ?? [] }));
  }

  const responses = await post<QueryResponse[]>(
    config,
    "/api/db/batch",
    batch,
  );
  return responses.map((response) => ({ rows: response.rows ?? [] }));
}

export const db = drizzle(proxy, proxyBatch, { schema });
