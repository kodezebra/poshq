<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    for: htmlFor,
    hint,
    error,
    children,
  }: {
    label: string;
    for: string;
    hint?: string;
    error?: string;
    children: Snippet;
  } = $props();
</script>

<div class="space-y-1.5">
  <label for={htmlFor} class="block text-caption text-ink-secondary">
    {label}
  </label>

  {@render children()}

  {#if error}
    <p class="text-caption text-ruby" id={`${htmlFor}-error`}>{error}</p>
  {:else if hint}
    <p class="text-caption text-ink-mute" id={`${htmlFor}-hint`}>{hint}</p>
  {/if}
</div>
