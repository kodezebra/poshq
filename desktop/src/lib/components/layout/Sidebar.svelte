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
  The rail is part of the dark frame. On desktop it collapses to 56px of icons
  so the register keeps its width; on small screens it is a full-width drawer.
  The active item is marked by a 2px action bar, not a filled block.
-->
<aside
  id="app-sidebar"
  aria-label="Sidebar"
  class={cn(
    "fixed bottom-0 left-0 top-11 z-40 flex w-64 flex-col border-r border-chrome-line bg-chrome transition-transform duration-200 ease-out sm:w-14 sm:translate-x-0",
    mobileOpen ? "translate-x-0 shadow-elev-2" : "-translate-x-full",
  )}
>
  <div
    class="flex h-11 items-center justify-between border-b border-chrome-line px-4 sm:hidden"
  >
    <span class="eyebrow text-chrome-mute">Navigation</span>
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-sm text-chrome-mute transition-colors hover:bg-chrome-raised hover:text-chrome-ink"
      aria-label="Close navigation"
      onclick={onclose}
    >
      <X class="size-4" />
    </button>
  </div>

  <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Main">
    {#each navItems as item (item.href)}
      {@const active = isActive(item.href)}
      <a
        href={item.href}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        onclick={onclose}
        class={cn(
          "group relative flex h-9 items-center gap-3 rounded-sm px-2.5 text-body-md transition-colors",
          "sm:justify-center sm:px-0",
          active
            ? "bg-chrome-raised text-chrome-ink"
            : "text-chrome-mute hover:bg-chrome-raised/60 hover:text-chrome-ink",
        )}
      >
        {#if active}
          <span
            class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-action-on-chrome"
            aria-hidden="true"
          ></span>
        {/if}
        <item.icon
          class={cn(
            "size-[18px] shrink-0",
            active
              ? "text-action-on-chrome"
              : "text-chrome-mute group-hover:text-chrome-ink",
          )}
        />
        <span class="flex-1 sm:hidden">{item.label}</span>
        {#if item.badge}
          <span
            class="inline-flex items-center rounded-sm bg-action-on-chrome/15 px-1.5 py-0.5 text-micro-cap text-action-on-chrome sm:hidden"
          >
            {item.badge}
          </span>
        {/if}
      </a>
    {/each}
  </nav>

  <!-- The till identity stays visible, but as one small block instead of a card. -->
  <div class="border-t border-chrome-line p-2">
    <div
      class="flex flex-col items-center rounded-sm bg-chrome-raised py-1.5 leading-tight"
      title="Till 01 — open"
    >
      <span class="tnum whitespace-nowrap text-caption text-chrome-ink">Till 01</span>
      <span class="mt-0.5 inline-flex items-center gap-1 text-micro-cap text-chrome-mute">
        <span class="size-1 rounded-full bg-success-chrome" aria-hidden="true"></span>
        Open
      </span>
    </div>
  </div>
</aside>
