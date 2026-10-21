<script lang="ts">
  import { cn } from "@/lib/utils";
</script>

<input 
  class={cn(
    "flex-1 rounded-border border-border bg-input px-3 py-2 text-sm placeholder-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:opacity-50 cursor-not-allowed"
  )}
  placeholder="Search..."
/>