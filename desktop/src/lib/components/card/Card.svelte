<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    class: className,
    padding = "md",
    children,
  }: {
    class?: string;
    padding?: "none" | "sm" | "md" | "lg";
    children: Snippet;
  } = $props();

  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };
</script>

<div
  class={cn(
    "rounded-lg border border-hairline bg-canvas",
    paddingClass[padding],
    className,
  )}
>
  {@render children()}
</div>
