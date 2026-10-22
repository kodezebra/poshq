<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    eyebrow,
    title,
    actions,
    class: className,
    children,
  }: {
    eyebrow?: string;
    title: string;
    actions?: Snippet;
    class?: string;
    /** Supporting line under the title, e.g. a live count. */
    children?: Snippet;
  } = $props();
</script>

<header class={cn("flex flex-wrap items-end justify-between gap-4", className)}>
  <div>
    {#if eyebrow}
      <p class="eyebrow text-ink-mute">{eyebrow}</p>
    {/if}

    <h1 class="mt-1 text-display-lg text-ink">{title}</h1>

    {#if children}
      <div class="mt-1 text-body-md text-ink-mute">
        {@render children()}
      </div>
    {/if}
  </div>

  {#if actions}
    <div class="flex flex-wrap items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</header>
