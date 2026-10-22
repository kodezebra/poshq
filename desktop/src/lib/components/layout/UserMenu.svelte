<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import { ChevronDown, LogOut, Settings, User } from "@lucide/svelte";

  // Placeholder identity until authentication lands.
  const user = {
    name: "Jane Doe",
    email: "jane@posh.app",
    initials: "JD",
  };

  const itemClass =
    "flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-body-md text-ink-secondary outline-none transition-colors data-[highlighted]:bg-canvas-soft data-[highlighted]:text-ink";
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        class="flex items-center gap-1.5 rounded-sm p-1 transition-colors hover:bg-chrome-raised"
        aria-label="Open account menu"
      >
        <span
          class="flex size-7 items-center justify-center rounded-sm bg-chrome-raised text-[10px] tracking-wide text-chrome-ink ring-1 ring-chrome-line ring-inset"
        >
          {user.initials}
        </span>
        <ChevronDown class="size-3.5 text-chrome-mute" />
      </button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Content
    align="end"
    sideOffset={8}
    class="z-50 w-60 rounded-lg border border-hairline bg-canvas p-1.5 shadow-elev-2"
  >
    <div class="px-2.5 py-2">
      <p class="text-caption text-ink">{user.name}</p>
      <p class="text-micro text-ink-mute">{user.email}</p>
    </div>

    <DropdownMenu.Separator class="my-1 h-px bg-hairline" />

    <DropdownMenu.Item class={itemClass}>
      <User class="size-4 text-ink-mute" />
      Profile
    </DropdownMenu.Item>
    <DropdownMenu.Item class={itemClass}>
      <Settings class="size-4 text-ink-mute" />
      Settings
    </DropdownMenu.Item>

    <DropdownMenu.Separator class="my-1 h-px bg-hairline" />

    <DropdownMenu.Item class="{itemClass} text-ruby data-[highlighted]:text-ruby">
      <LogOut class="size-4" />
      Sign out
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
