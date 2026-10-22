<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import Sidebar from "./Sidebar.svelte";
  import TopBar from "./TopBar.svelte";

  let { children } = $props();

  let mobileOpen = $state(false);

  const toggle = () => (mobileOpen = !mobileOpen);
  const close = () => (mobileOpen = false);

  // Navigating always dismisses the mobile drawer.
  afterNavigate(close);

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
    {@render children()}
  </main>
</div>
