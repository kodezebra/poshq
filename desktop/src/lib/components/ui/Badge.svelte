<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    variant = "neutral",
    class: className,
    children,
  }: {
    variant?: "neutral" | "brand" | "success" | "danger";
    class?: string;
    children: Snippet;
  } = $props();

  const tones = {
    neutral: "bg-canvas-sunken text-ink-mute ring-hairline",
    brand: "bg-primary/5 text-primary ring-primary/15",
    success: "bg-success/5 text-success ring-success/20",
    danger: "bg-danger/5 text-danger ring-danger/15",
  };
</script>

<span
  class={cn(
    "inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-micro ring-1 ring-inset",
    tones[variant],
    className,
  )}
>
  {@render children()}
</span>
