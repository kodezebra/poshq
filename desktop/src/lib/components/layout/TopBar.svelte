<script lang="ts">
  import { Menu } from "@lucide/svelte";
  import Brand from "./Brand.svelte";
  import UserMenu from "./UserMenu.svelte";

  let {
    mobileOpen = false,
    ontoggle,
  }: { mobileOpen?: boolean; ontoggle: () => void } = $props();
</script>

<!--
  The dark frame is the product's signature: chrome recedes, the work surface
  carries the sale. 44px is enough for the wordmark and identity without
  stealing a row from the register at 1366×768.
-->
<nav class="fixed inset-x-0 top-0 z-50 h-11 border-b border-chrome-line bg-chrome">
  <div class="flex h-full items-center gap-3 px-3">
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-sm text-chrome-ink transition-colors hover:bg-chrome-raised sm:hidden"
      aria-controls="app-sidebar"
      aria-expanded={mobileOpen}
      aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      onclick={ontoggle}
    >
      <Menu class="size-5" />
    </button>

    <Brand />

    <div class="ms-auto flex items-center gap-3">
      <UserMenu />
    </div>
  </div>
</nav>
