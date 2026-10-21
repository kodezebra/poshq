<script lang="ts">
  import { cn } from "@/lib/utils";
</script>

<article class={cn("group rounded-lg border-border bg-card p-4 hover:bg-primary/5 transition-colors cursor-pointer")}>
  <div class="h-20 w-20 rounded-md overflow-hidden bg-muted">
    <img src="/placeholder.svg?height=200&width=200" alt="Product" class="h-full w-full object-cover" />
  </div>

  <div class="mt-3">
    <h3 class="line-clamp-1 text-sm font-medium">Product Name</h3>

    <div class="flex items-center justify-between mt-1">
      <span class="text-xs text-muted-foreground">Category</span>

      <div class="flex items-center gap-1">
        <svg class="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 15.14L18.18 21.01L12 17.77L7.82 21.01L9 15.14L4 9.27L11.09 8.26L12 2Z"/>
        </svg>
        <span class="text-sm font-medium">$4.50</span>
      </div>
    </div>
  </div>
</article>