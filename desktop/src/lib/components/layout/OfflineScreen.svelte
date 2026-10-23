<script lang="ts">
  import {
    CircleAlert,
    LoaderCircle,
    MonitorSmartphone,
    Server,
    WifiOff,
  } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Brand from "$lib/components/layout/Brand.svelte";
  import { connection } from "$lib/stores/connection.svelte";

  let {
    role,
    message,
    busy = false,
    onretry,
    onchange,
  }: {
    role: "main" | "client";
    message: string | null;
    busy?: boolean;
    onretry: () => void;
    onchange: () => void;
  } = $props();

  const isMain = $derived(role === "main");
</script>

<div class="flex min-h-dvh flex-col bg-canvas-soft">
  <header class="flex h-11 shrink-0 items-center border-b border-chrome-line bg-chrome px-3">
    <Brand />
    <span class="ms-auto text-micro-cap uppercase tracking-wide text-chrome-mute">
      {connection.config?.tillCode ?? "Till"}
    </span>
  </header>

  <main class="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
    <div class="w-full max-w-lg">
      <span
        class="flex size-12 items-center justify-center rounded-lg bg-danger/10 text-danger"
      >
        {#if isMain}
          <Server class="size-6" />
        {:else}
          <WifiOff class="size-6" />
        {/if}
      </span>

      <p class="eyebrow mt-5 text-ink-mute">
        {connection.config?.tillName ?? "This till"}
      </p>
      <h1 class="mt-2 text-heading-lg text-ink">
        {isMain ? "The main till could not start" : "The main till is not reachable"}
      </h1>
      <p class="mt-2 text-body-md text-ink-mute">
        {#if isMain}
          This computer could not open the shop network. Selling is paused so
          the tills do not drift apart.
        {:else}
          Sales are paused until this till can reach the computer that keeps the
          shop's orders.
        {/if}
      </p>

      {#if connection.url}
        <p class="mt-4 flex items-center gap-2 text-caption text-ink-mute">
          <MonitorSmartphone class="size-4 shrink-0 text-ink-faint" />
          <span class="truncate font-mono">{connection.url}</span>
        </p>
      {/if}

      {#if message}
        <p
          class="mt-4 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/5 p-3 text-body-md text-danger"
          role="alert"
        >
          <CircleAlert class="mt-0.5 size-4 shrink-0" />
          {message}
        </p>
      {/if}

      <div class="mt-5 rounded-md border border-hairline bg-canvas p-4">
        <p class="text-caption text-ink-secondary">
          {#if isMain}
            Check that no other program is using port 47821, then try again. If
            this computer has no network, connect it to the shop's WiFi first.
          {:else}
            Check that the main till is open, awake and on the same WiFi or LAN.
            The token must match the one shown on the main till.
          {/if}
        </p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <Button onclick={onretry} disabled={busy}>
          {#if busy}
            <LoaderCircle class="size-4 animate-spin" />
            {isMain ? "Starting…" : "Connecting…"}
          {:else}
            {isMain ? "Try again" : "Reconnect"}
          {/if}
        </Button>
        <Button variant="ghost" onclick={onchange} disabled={busy}>
          Change setup
        </Button>
      </div>
    </div>
  </main>
</div>
