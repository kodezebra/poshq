/**
 * Which computer this install is, and where the main till lives.
 *
 * The role is chosen once on first run and kept in local storage. The main
 * till owns SQLite and serves the LAN API; clients send every query to it.
 * Keeping this module free of Tauri imports makes it testable in Node.
 */

export type TillRole = "main" | "client";

export type ConnectionConfig = {
  role: TillRole;
  /** The name people see, e.g. "Front counter". */
  tillName: string;
  /** Short, unique marker used in order numbers, e.g. "T1". */
  tillCode: string;
  /** Client only: the main till's address, without a trailing slash. */
  serverUrl: string;
  /** Shared secret sent as `x-posh-token`. */
  token: string;
  /** Main only: the LAN port the server binds. */
  port: number;
};

type HealthResponse = {
  ok: boolean;
  app: string;
  version: string;
};

export const CONNECTION_KEY = "posh.connection.v1";
export const DEFAULT_PORT = 47_821;
export const TOKEN_HEADER = "x-posh-token";

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function isTillRole(value: unknown): value is TillRole {
  return value === "main" || value === "client";
}

/** A short code that can safely sit inside an order number. */
export function normalizeTillCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

export function isValidTillCode(raw: string): boolean {
  return /^[A-Za-z0-9]{1,4}$/.test(raw.trim());
}

export function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Accept `192.168.1.5`, `192.168.1.5:47821` or a full URL. A missing port
 * gets Posh's port, because every A1 main till serves there.
 */
export function normalizeServerUrl(
  raw: string,
  fallbackPort: number = DEFAULT_PORT,
): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Enter the main till address.");

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("That address is not valid. Try 192.168.1.5:47821.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The main till address must start with http:// or https://.");
  }

  if (!url.hostname) {
    throw new Error("That address is not valid. Try 192.168.1.5:47821.");
  }

  if (!url.port) url.port = String(fallbackPort);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function serverUrlFrom(ip: string | null, port: number): string {
  const host = ip && ip.includes(":") ? `[${ip}]` : (ip ?? "127.0.0.1");
  return `http://${host}:${port}`;
}

export function apiUrl(config: ConnectionConfig, path: string): string {
  return `${config.serverUrl.replace(/\/+$/, "")}${path}`;
}

export function getConnection(): ConnectionConfig | null {
  const store = storage();
  const raw = store?.getItem(CONNECTION_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<ConnectionConfig>;
    if (
      !isTillRole(value.role) ||
      typeof value.tillName !== "string" ||
      !value.tillName.trim() ||
      typeof value.tillCode !== "string" ||
      !isValidTillCode(value.tillCode) ||
      typeof value.token !== "string" ||
      value.token.length < 8 ||
      typeof value.serverUrl !== "string" ||
      typeof value.port !== "number"
    ) {
      return null;
    }

    return {
      role: value.role,
      tillName: value.tillName.trim(),
      tillCode: normalizeTillCode(value.tillCode),
      serverUrl: value.serverUrl,
      token: value.token,
      port: value.port,
    };
  } catch {
    return null;
  }
}

export function saveConnection(config: ConnectionConfig): void {
  if (!isTillRole(config.role)) throw new Error("Choose main till or client till.");
  if (!config.tillName.trim()) throw new Error("Give this till a name.");
  if (!isValidTillCode(config.tillCode)) {
    throw new Error("The till code must be 1–4 letters or numbers, like T1.");
  }
  if (config.token.trim().length < 8) {
    throw new Error("The till token must be at least 8 characters.");
  }

  const normalized: ConnectionConfig = {
    role: config.role,
    tillName: config.tillName.trim(),
    tillCode: normalizeTillCode(config.tillCode),
    serverUrl:
      config.role === "client"
        ? normalizeServerUrl(config.serverUrl, config.port)
        : config.serverUrl,
    token: config.token.trim(),
    port: config.port,
  };

  const store = storage();
  if (!store) throw new Error("This device cannot store the till settings.");
  store.setItem(CONNECTION_KEY, JSON.stringify(normalized));
}

export function clearConnection(): void {
  storage()?.removeItem(CONNECTION_KEY);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Something went wrong.";
  }
}

/**
 * Ask the main till whether this token works. A timeout is deliberate: a
 * silent network should become a clear "cannot reach it" message, not an
 * indefinite spinner.
 */
export async function checkServer(
  config: Pick<ConnectionConfig, "serverUrl" | "token">,
  timeoutMs = 5_000,
): Promise<HealthResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${config.serverUrl.replace(/\/+$/, "")}/health`,
      {
        headers: { [TOKEN_HEADER]: config.token },
        signal: controller.signal,
      },
    );

    if (response.status === 401) {
      throw new Error("The till token does not match the main till.");
    }

    if (!response.ok) {
      throw new Error(`The main till answered with status ${response.status}.`);
    }

    const health = (await response.json()) as HealthResponse;
    if (!health.ok) throw new Error("The main till is not ready.");
    return health;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "The main till did not answer. Check that it is on and on the same network.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the main till. Check the address, the network and the main till's screen.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
