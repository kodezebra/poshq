<script lang="ts">
  import { cn } from "@/lib/utils";
</script>

<header class={cn(
  "border-b border-border bg-card sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white shadow-sm"
)}>
  <div class="flex items-center gap-4">
    <h1 class="font-bold text-xl tracking-tight">{@html title}</h1>
  </div>

  <div class="flex items-center gap-3">
    <div class="relative">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.75 4.75h11.5a2 2 0 012 2v11a2 2 0 01-2 2H5.25m8.5-13h-11.5A2.25 2.25 0 002.5 4.75v11a2.25 2.25 0 002.25 2.25h11.5a2.25 2.25 0 002.25-2.25V4.75z"/>
      </svg>
      <span class="hidden absolute right-1 top-1 h-3 w-3 rounded-full bg-green-500"></span>
    </div>

    <div class="relative">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.75 4.75h11.5a2 2 0 012 2v11a2 2 0 01-2 2H5.25m8.5-13h-11.5A2.25 2.25 0 002.5 4.75v11a2.25 2.25 0 002.25 2.25h11.5a2.25 2.25 0 002.25-2.25V4.75z"/>
      </svg>
      <button class="flex items-center gap-2 text-sm font-medium hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        User
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.75 4.75h11.5a2 2 0 012 2v11a2 2 0 01-2 2H5.25m8.5-13h-11.5A2.25 2.25 0 002.5 4.75v11a2.25 2.25 0 002.25 2.25h11.5a2.25 2.25 0 002.25-2.25V4.75z"/>
        </svg>
      </button>

      <ul class={cn(
        "absolute right-0 mt-2 w-36 rounded-md border-bg p-2 shadow-lg start-6 transform origin-top-right divide-y divide-border"
      )}>
        <li>
          <button class={cn("flex items-center py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary")}>
            Profile
          </button>
        </li>
        <li>
          <button class={cn("flex items-center py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary")}>
            Settings
          </button>
        </li>
        <li>
          <button class={cn("flex items-center py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary")} on:click={() => alert("logout")}>
            Logout
          </button>
        </li>
      </ul>
    </div>
  </div>
</header>