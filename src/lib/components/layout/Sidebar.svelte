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
    return href === "/dashboard"
      ? path === "/dashboard"
      : path === href || path.startsWith(`${href}/`);
  }
</script>

<aside
  id="app-sidebar"
  aria-label="Sidebar"
  class={cn(
    "fixed bottom-0 left-0 top-14 z-40 flex w-64 flex-col border-r border-hairline bg-canvas transition-transform duration-200 ease-out sm:translate-x-0",
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

  <div class="flex-1 overflow-y-auto px-3 py-4">
    <p class="eyebrow px-3 pb-2 text-ink-mute">Menu</p>

    <nav class="flex flex-col gap-0.5">
      {#each navItems as item (item.href)}
        {@const active = isActive(item.href)}
        <a
          href={item.href}
          aria-current={active ? "page" : undefined}
          onclick={onclose}
          class={cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-body-md transition-colors",
            active
              ? "bg-primary/5 text-primary"
              : "text-ink-secondary hover:bg-canvas-soft hover:text-ink",
          )}
        >
          <item.icon
            class={cn(
              "size-4 shrink-0",
              active
                ? "text-primary"
                : "text-ink-mute group-hover:text-ink-secondary",
            )}
          />
          <span class="flex-1">{item.label}</span>
          {#if item.badge}
            <span
              class="inline-flex items-center rounded-pill bg-primary-subdued px-2 py-0.5 text-micro-cap text-primary-deep"
            >
              {item.badge}
            </span>
          {/if}
        </a>
      {/each}
    </nav>
  </div>

  <div class="border-t border-hairline p-3">
    <div class="rounded-lg bg-canvas-soft p-3">
      <p class="eyebrow text-ink-mute">Register</p>
      <div class="mt-1 flex items-center justify-between">
        <span class="text-body-md text-ink">Till 01</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-pill bg-primary-subdued px-2 py-0.5 text-micro-cap text-primary-deep"
        >
          <span class="size-1.5 rounded-full bg-primary"></span>
          Open
        </span>
      </div>
    </div>
  </div>
</aside>
