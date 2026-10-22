<script lang="ts">
  import { ArrowLeft } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    eyebrow,
    title,
    back,
    actions,
    class: className,
    children,
  }: {
    eyebrow?: string;
    title: string;
    /** Optional back link, rendered as an icon button before the title. */
    back?: { href: string; label: string };
    actions?: Snippet;
    class?: string;
    /** Supporting line, e.g. a live count. Sits inline with the title. */
    children?: Snippet;
  } = $props();
</script>

<header class={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
  {#if back}
    <a
      href={back.href}
      aria-label={back.label}
      title={back.label}
      class="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-hairline text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowLeft class="size-4" />
    </a>
  {/if}

  <div class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
    {#if eyebrow}
      <p class="eyebrow text-ink-mute">{eyebrow}</p>
    {/if}

    <h1 class="text-heading-lg text-ink">{title}</h1>

    {#if children}
      <div class="text-caption text-ink-mute">
        {@render children()}
      </div>
    {/if}
  </div>

  {#if actions}
    <div class="ms-auto flex flex-wrap items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</header>
