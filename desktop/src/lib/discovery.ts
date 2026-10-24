import { invoke } from "@tauri-apps/api/core";

/** One main till that answered on the local network. */
export type DiscoveredTill = {
  /** The mDNS full name, used as a stable list key. */
  id: string;
  name: string;
  code: string;
  address: string;
  port: number;
  version: string;
};

/** True only inside the Tauri shell, where mDNS is available. */
export function hasBridge(): boolean {
  return (
    typeof (globalThis as { __TAURI_INTERNALS__?: { invoke?: unknown } })
      .__TAURI_INTERNALS__?.invoke === "function"
  );
}

/**
 * Browse the shop network for main tills. A plain browser cannot use mDNS, so
 * it gets an empty list and the setup form falls back to a typed address.
 */
export async function discoverTills(
  timeoutMs = 2_500,
): Promise<DiscoveredTill[]> {
  if (!hasBridge()) return [];
  return invoke<DiscoveredTill[]>("discover_tills", { timeoutMs });
}
