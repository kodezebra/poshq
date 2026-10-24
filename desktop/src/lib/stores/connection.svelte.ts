import { invoke } from "@tauri-apps/api/core";
import {
  checkServer,
  errorMessage,
  getConnection,
  serverUrlFrom,
  type ConnectionConfig,
} from "$lib/connection";

type ServerInfo = {
  ip: string | null;
  port: number;
};

/**
 * The live connection between this window and the database owner. The gate
 * uses `start()` once; the shell uses `watch()` to keep the badge honest.
 */
class ConnectionStore {
  config = $state<ConnectionConfig | null>(null);
  online = $state(false);
  starting = $state(true);
  error = $state<string | null>(null);
  serverInfo = $state<ServerInfo | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;
  private checking = false;

  get isMain(): boolean {
    return this.config?.role === "main";
  }

  get url(): string {
    if (this.config?.role === "client") return this.config.serverUrl;
    if (this.serverInfo) {
      return serverUrlFrom(this.serverInfo.ip, this.serverInfo.port);
    }
    return this.config?.serverUrl ?? "";
  }

  /** Read the saved role and bring the connection up. Idempotent. */
  async start(): Promise<boolean> {
    this.config = getConnection();
    this.error = null;

    if (!this.config) {
      this.starting = false;
      this.online = false;
      return false;
    }

    this.starting = true;

    if (this.config.role === "main") {
      try {
        this.serverInfo = await invoke<ServerInfo>("start_lan_server", {
          token: this.config.token,
          port: this.config.port,
          tillName: this.config.tillName,
          tillCode: this.config.tillCode,
        });
        this.online = true;
      } catch (error) {
        this.online = false;
        this.error = errorMessage(error);
      }
    } else {
      try {
        await checkServer(this.config);
        this.online = true;
      } catch (error) {
        this.online = false;
        this.error = errorMessage(error);
      }
    }

    this.starting = false;
    return this.online;
  }

  async retry(): Promise<boolean> {
    return this.start();
  }

  /**
   * Clients poll the main till so a pulled cable is visible before someone
   * tries to charge. The interval lives with the app shell and is cleared on
   * teardown; a main till has nothing to poll.
   */
  watch(): () => void {
    if (this.timer) return () => this.stopWatching();
    if (this.config?.role !== "client") return () => {};

    this.timer = setInterval(async () => {
      if (this.checking || this.config?.role !== "client") return;
      this.checking = true;
      try {
        await checkServer(this.config, 4_000);
        if (!this.online) {
          this.online = true;
          this.error = null;
        }
      } catch (error) {
        if (this.online) {
          this.online = false;
          this.error = errorMessage(error);
        }
      } finally {
        this.checking = false;
      }
    }, 10_000);

    return () => this.stopWatching();
  }

  stopWatching(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async stopServer(): Promise<void> {
    if (this.config?.role !== "main") return;
    try {
      await invoke("stop_lan_server");
    } catch {
      // The next app start will fail to bind if a listener survived; there
      // is nothing useful to tell the cashier while they are changing setup.
    }
    this.online = false;
  }
}

export const connection = new ConnectionStore();
