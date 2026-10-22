<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  let {
    headers,
    children,
    class: className,
  }: {
    /** Column labels, rendered left-aligned (RTL-aware). */
    headers: string[];
    /** `<tr>` rows. Use `td` with the `tnum` class for money values. */
    children: Snippet;
    class?: string;
  } = $props();
</script>

<div
  class={cn(
    "overflow-x-auto rounded-lg border border-hairline bg-canvas",
    className,
  )}
>
  <table class="w-full border-collapse text-body-tabular">
    <thead>
      <tr class="border-b border-hairline">
        {#each headers as header}
          <th
            class="whitespace-nowrap px-3 py-2 text-start text-caption font-normal text-ink-mute"
          >
            {header}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-hairline">
      {@render children()}
    </tbody>
  </table>
</div>
