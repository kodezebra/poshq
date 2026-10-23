<script lang="ts">
  import { onMount } from "svelte";
  import { RefreshCw, WifiOff } from "@lucide/svelte";
  import { afterNavigate } from "$app/navigation";
  import Button from "$lib/components/button/Button.svelte";
  import { connection } from "$lib/stores/connection.svelte";
  import Sidebar from "./Sidebar.svelte";
  import TopBar from "./TopBar.svelte";

  let { children } = $props();

  let mobileOpen = $state(false);
  let retrying = $state(false);

  const toggle = () => (mobileOpen = !mobileOpen);
  const close = () => (mobileOpen = false);

  // Navigating always dismisses the mobile drawer.
  afterNavigate(close);

  onMount(() => connection.watch());

  async function reconnect() {
    if (retrying) return;
    retrying = true;
    await connection.retry();
    retrying = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && mobileOpen) close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-dvh bg-canvas-soft">
  <TopBar {mobileOpen} ontoggle={toggle} />
  <Sidebar {mobileOpen} onclose={close} />

  {#if mobileOpen}
    <button
      type="button"
      tabindex="-1"
      aria-label="Close navigation"
      class="fixed inset-0 z-30 cursor-default bg-ink/30 sm:hidden"
      onclick={close}
    ></button>
  {/if}

  <main class="min-h-dvh pt-11 sm:pl-14">
    {#if connection.config?.role === "client" && !connection.online}
      <div
        class="sticky top-11 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-danger/25 bg-danger/5 px-3 py-2 sm:px-4"
        role="status"
      >
        <WifiOff class="size-4 shrink-0 text-danger" />
        <p class="min-w-0 flex-1 text-caption text-ink-secondary">
          <span class="font-medium text-ink">Main till unreachable.</span>
          Sales are paused until this till reconnects.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onclick={reconnect}
          disabled={retrying}
        >
          <RefreshCw class={retrying ? "size-3.5 animate-spin" : "size-3.5"} />
          {retrying ? "Connecting…" : "Reconnect"}
        </Button>
      </div>
    {/if}

    {@render children()}
  </main>
</div>
