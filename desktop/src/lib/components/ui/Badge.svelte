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
    neutral: "bg-canvas-soft text-ink-mute ring-hairline",
    brand: "bg-primary/5 text-primary ring-primary/15",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    danger: "bg-ruby/5 text-ruby ring-ruby/15",
  };
</script>

<span
  class={cn(
    "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-micro ring-1 ring-inset",
    tones[variant],
    className,
  )}
>
  {@render children()}
</span>
