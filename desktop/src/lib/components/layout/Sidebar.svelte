<script lang="ts">
  import { X } from "@lucide/svelte";
  import { page } from "$app/state";
  import { navItems } from "$lib/navigation";
  import { cn } from "$lib/utils";

  let {
    mobileOpen = false,
    onclose,
  }: { mobileOpen?: boolean; onclose: () => void } = $props();

  function isActive(href: string) {
    const path = page.url.pathname;
    // "/" would otherwise match every path via the prefix check.
    return path === href || path.startsWith(`${href}/`);
  }
</script>

<!--
  On desktop the sidebar collapses to an icon rail so the register keeps its
  screen space. On small screens it is a full-width drawer with labels.
-->
<aside
  id="app-sidebar"
  aria-label="Sidebar"
  class={cn(
    "fixed bottom-0 left-0 top-12 z-40 flex w-64 flex-col border-r border-hairline bg-canvas transition-transform duration-200 ease-out sm:w-16 sm:translate-x-0",
    mobileOpen ? "translate-x-0 shadow-elev-2" : "-translate-x-full",
  )}
>
  <div
    class="flex h-12 items-center justify-between border-b border-hairline px-4 sm:hidden"
  >
    <span class="eyebrow text-ink-mute">Navigation</span>
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-md text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink"
      aria-label="Close navigation"
      onclick={onclose}
    >
      <X class="size-4" />
    </button>
  </div>

  <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Main">
    {#each navItems as item (item.href)}
      {@const active = isActive(item.href)}
      <a
        href={item.href}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        onclick={onclose}
        class={cn(
          "group flex h-10 items-center gap-3 rounded-md px-3 text-body-md transition-colors",
          "sm:justify-center sm:px-0",
          active
            ? "bg-primary/5 text-primary"
            : "text-ink-secondary hover:bg-canvas-soft hover:text-ink",
        )}
      >
        <item.icon
          class={cn(
            "size-[18px] shrink-0",
            active ? "text-primary" : "text-ink-mute group-hover:text-ink-secondary",
          )}
        />
        <span class="flex-1 sm:hidden">{item.label}</span>
        {#if item.badge}
          <span
            class="inline-flex items-center rounded-pill bg-primary-subdued px-2 py-0.5 text-micro-cap text-primary-deep sm:hidden"
          >
            {item.badge}
          </span>
        {/if}
      </a>
    {/each}
  </nav>

  <!-- The till identity stays visible, but as one small block instead of a card. -->
  <div class="border-t border-hairline p-2">
    <div
      class="flex flex-col items-center rounded-md bg-canvas-soft py-1.5 leading-tight"
      title="Till 01 — open"
    >
      <span class="tnum whitespace-nowrap text-caption text-ink">Till 01</span>
      <span class="mt-0.5 inline-flex items-center gap-1 text-micro-cap text-ink-mute">
        <span class="size-1 rounded-full bg-primary" aria-hidden="true"></span>
        Open
      </span>
    </div>
  </div>
</aside>
