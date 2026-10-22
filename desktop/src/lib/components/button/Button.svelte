<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import { buttonVariants, type ButtonVariants } from "./variants";

  let {
    variant = "primary",
    size = "md",
    href,
    class: className,
    children,
    ...rest
  }: ButtonVariants & {
    href?: string;
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  } = $props();

  const classes = $derived(cn(buttonVariants({ variant, size }), className));
</script>

{#if href}
  <a {href} class={classes} {...rest}>{@render children()}</a>
{:else}
  <button class={classes} {...rest}>{@render children()}</button>
{/if}
