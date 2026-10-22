<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import { EllipsisVertical } from "@lucide/svelte";
  import type { Component } from "svelte";
  import { cn } from "$lib/utils";

  export type ActionMenuItem = {
    label: string;
    icon?: Component;
    destructive?: boolean;
    onselect: () => void;
  };

  let {
    label = "More actions",
    items,
    class: className,
  }: {
    label?: string;
    items: ActionMenuItem[];
    class?: string;
  } = $props();

  const itemClass =
    "flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-body-md text-ink-secondary outline-none transition-colors data-[highlighted]:bg-canvas-soft data-[highlighted]:text-ink";
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        class={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
        aria-label={label}
        title={label}
      >
        <EllipsisVertical class="size-4" />
      </button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Content
    align="end"
    sideOffset={6}
    class="z-50 min-w-44 rounded-lg border border-hairline bg-canvas p-1.5 shadow-elev-2"
  >
    {#each items as item (item.label)}
      <DropdownMenu.Item
        class={cn(itemClass, item.destructive && "text-ruby data-[highlighted]:text-ruby")}
        onSelect={item.onselect}
      >
        {#if item.icon}
          <item.icon
            class={cn("size-4", item.destructive ? "text-ruby" : "text-ink-mute")}
          />
        {/if}
        {item.label}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
