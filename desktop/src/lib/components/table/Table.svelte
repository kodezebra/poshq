<script lang="ts">
  import { ArrowDown, ArrowUp, ChevronsUpDown } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { TableColumn, TableSort } from "./types";

  let {
    columns,
    sort = null,
    onsort,
    children,
    class: className,
  }: {
    columns: TableColumn[];
    sort?: TableSort | null;
    onsort?: (key: string) => void;
    /** `<tr>` rows. Use `td` with the `tnum` class for money values. */
    children: Snippet;
    class?: string;
  } = $props();

  const sortable = (column: TableColumn) => Boolean(column.sortKey && onsort);

  const direction = (column: TableColumn) => {
    if (!sort || sort.key !== column.sortKey) return null;
    return sort.direction;
  };

  /** `aria-sort` belongs on the header cell, not on its button. */
  const ariaSort = (column: TableColumn): "ascending" | "descending" | "none" | undefined => {
    if (!sortable(column)) return undefined;
    const dir = direction(column);
    return dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none";
  };
</script>

<!--
  Two rules carry this table: headers park under the 44px chrome bar while the
  page scrolls, and every numeric column is right-aligned so a column of money
  can be read by its digits rather than its row.

  The header stays sticky only where the table fits its container; below `lg`
  the wrapper scrolls sideways instead, and a sticky header inside a
  horizontal scrollport would stick to the wrong box.
-->
<div
  class={cn(
    "overflow-x-auto rounded-lg border border-hairline bg-canvas lg:overflow-visible",
    className,
  )}
>
  <table class="w-full border-collapse text-body-tabular">
    <thead>
      <tr class="border-b border-hairline">
        {#each columns as column (column.label)}
          <th
            scope="col"
            aria-sort={ariaSort(column)}
            class={cn(
              "sticky top-11 z-10 bg-canvas-sunken p-0 text-start text-caption font-normal text-ink-mute",
              column.align === "end" && "text-end",
            )}
          >
            {#if sortable(column)}
              <button
                type="button"
                onclick={() => onsort?.(column.sortKey!)}
                class={cn(
                  "flex h-9 w-full items-center gap-1.5 px-3 transition-colors hover:text-ink",
                  column.align === "end" ? "justify-end" : "justify-start",
                  direction(column) && "text-ink",
                )}
              >
                {column.label}
                {#if direction(column) === "asc"}
                  <ArrowUp class="size-3 shrink-0" />
                {:else if direction(column) === "desc"}
                  <ArrowDown class="size-3 shrink-0" />
                {:else}
                  <ChevronsUpDown class="size-3 shrink-0 opacity-40" />
                {/if}
              </button>
            {:else}
              <span
                class={cn(
                  "flex h-9 items-center px-3",
                  column.align === "end" && "justify-end",
                )}
              >
                {column.label}
              </span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody class="divide-y divide-hairline">
      {@render children()}
    </tbody>
  </table>
</div>
