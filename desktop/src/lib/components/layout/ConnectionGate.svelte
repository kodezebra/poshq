<script lang="ts">
  import { onMount } from "svelte";
  import { LoaderCircle } from "@lucide/svelte";
  import Brand from "$lib/components/layout/Brand.svelte";
  import OfflineScreen from "$lib/components/layout/OfflineScreen.svelte";
  import SetupScreen from "$lib/components/layout/SetupScreen.svelte";
  import { clearConnection, getConnection } from "$lib/connection";
  import { connection } from "$lib/stores/connection.svelte";

  let { children } = $props();

  type Phase = "loading" | "setup" | "blocked" | "ready";

  let phase = $state<Phase>("loading");
  let busy = $state(false);
  let error = $state<string | null>(null);

  onMount(() => {
    if (!getConnection()) {
      phase = "setup";
      return;
    }

    void boot();
  });

  async function boot() {
    phase = "loading";
    error = null;

    const ok = await connection.start();
    if (ok) {
      phase = "ready";
    } else {
      error = connection.error;
      phase = "blocked";
    }
  }

  async function retry() {
    if (busy) return;
    busy = true;
    await boot();
    busy = false;
  }

  async function changeSetup() {
    if (busy) return;
    busy = true;
    await connection.stopServer();
    clearConnection();
    window.location.reload();
  }
</script>

{#if phase === "loading"}
  <div class="flex min-h-dvh flex-col bg-canvas-soft">
    <header class="flex h-11 shrink-0 items-center border-b border-chrome-line bg-chrome px-3">
      <Brand />
      <span class="ms-auto text-micro-cap uppercase tracking-wide text-chrome-mute">
        {connection.config?.tillCode ?? "Till"}
      </span>
    </header>

    <main class="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <LoaderCircle class="size-5 animate-spin text-ink-mute" />
      <p class="mt-3 text-body-md text-ink-secondary" aria-live="polite">
        {connection.config?.role === "client"
          ? "Connecting to the main till…"
          : "Opening this till…"}
      </p>
      <p class="mt-1 text-caption text-ink-mute">
        {connection.config?.tillName}
      </p>
    </main>
  </div>
{:else if phase === "setup"}
  <SetupScreen />
{:else if phase === "blocked" && connection.config}
  <OfflineScreen
    role={connection.config.role}
    message={error}
    {busy}
    onretry={retry}
    onchange={changeSetup}
  />
{:else}
  {@render children()}
{/if}
