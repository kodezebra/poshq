<script lang="ts">
  import { Menu } from "@lucide/svelte";
  import Brand from "./Brand.svelte";
  import UserMenu from "./UserMenu.svelte";

  let {
    mobileOpen = false,
    ontoggle,
  }: { mobileOpen?: boolean; ontoggle: () => void } = $props();
</script>

<nav class="fixed inset-x-0 top-0 z-50 h-12 border-b border-hairline bg-canvas">
  <div class="flex h-full items-center gap-3 px-3">
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-canvas-soft hover:text-ink sm:hidden"
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
