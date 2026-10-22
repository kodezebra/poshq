<script lang="ts">
  import { Dialog } from "bits-ui";
  import { X } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    open = $bindable(false),
    title,
    description,
    size = "md",
    children,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    size?: "md" | "lg";
    children: Snippet;
  } = $props();

  const widths = {
    md: "max-w-lg",
    lg: "max-w-2xl",
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-[1px]"
    />
    <Dialog.Content
      class={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
        "rounded-xl border border-hairline bg-canvas p-6 shadow-elev-2",
        widths[size],
      )}
    >
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <Dialog.Title class="text-heading-md text-ink">{title}</Dialog.Title>
          {#if description}
            <Dialog.Description class="mt-1 text-body-md text-ink-mute">
              {description}
            </Dialog.Description>
          {/if}
        </div>

        <Dialog.Close
          class="-mr-1 -mt-1 rounded-md p-1.5 text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X class="size-4" />
          <span class="sr-only">Close</span>
        </Dialog.Close>
      </div>

      <div class="mt-5">
        {@render children()}
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
