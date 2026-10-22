<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    title,
    description,
    icon,
    actions,
    class: className,
  }: {
    title: string;
    description?: string;
    icon?: Snippet;
    actions?: Snippet;
    class?: string;
  } = $props();
</script>

<div
  class={cn(
    "flex flex-col items-center rounded-lg border border-dashed border-hairline bg-canvas px-6 py-12 text-center",
    className,
  )}
>
  {#if icon}
    <div class="text-ink-mute">
      {@render icon()}
    </div>
  {/if}

  <p class="mt-3 text-heading-sm text-ink">{title}</p>

  {#if description}
    <p class="mt-1 max-w-md break-words text-body-md text-ink-mute">
      {description}
    </p>
  {/if}

  {#if actions}
    <div class="mt-4">
      {@render actions()}
    </div>
  {/if}
</div>
