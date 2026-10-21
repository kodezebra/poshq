<script lang="ts">
  import { cn } from "@/lib/utils";
</script>

<table class={cn("w-full rounded-md border-border text-sm")}>
  <thead>
    <tr class={cn("border-b border-border bg-card")}>
      {#each headers as header}
      <th class="p-3 text-left text-muted-foreground font-medium">{@html header}</th>
      {/each}
    </tr>
  </thead>

  <tbody>
    {#each rows as row (row.id)}
    <tr class={cn("border-b border-border/50 odd:bg-card even:bg-muted/50")}>
      {#each row.cells as cell}
      <td class="p-3">{@html cell}</td>
      {/each}
    </tr>
    {/each}
  </tbody>
</table>