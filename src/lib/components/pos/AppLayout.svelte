<script lang="ts">
  import { cn } from "@/lib/utils";
</script>

<div class="min-h-screen bg-background">
  <div class="flex flex-col md:flex-row h-screen">

    <!-- Sidebar -->
    <aside class="w-64 md:w-72 border-r border-border bg-card text-sm sidebar-sticky">
      <div class="p-4 border-b border-border">
        <h2 class="font-semibold text-lg">POS System</h2>
      </div>

      <nav class="flex flex-col space-y-1 px-2">
        <a class="flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/20 block">
          <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <span>Dashboard</span>
        </a>

        <a class="flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/20 block">
          <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H8a2 2 0 00-2 2z"/>
          </svg>
          <span>Products</span>
        </a>

        <a class="flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/20 block">
          <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2 1.6 3L3 22l.4-3 1.6-2H7l.4 2 1.6 3L7 22l-.4-3.2H3.2a2.2 2.2 0 01-2-2V5a2.2 2.2 0 012-2.2h1.2m7.3 3.3h8.2a2.2 2.2 0 012 2.2v8.2a2.2 2.2 0 01-2.2 2.2h-8.2a2.2 2.2 0 01-2.2-2.2v-8.2a2.2 2.2 0 012-2.2zM9 10h.3v3a2 2 0 002 2h7a2 2 0 002-2v-3h.3a2 2 0 002-2H5a2 2 0 00-2-2H2a2 2 0 00-2 2v3h.3a2 2 0 002 2z"/>
          </svg>
          <span>Cart</span>
        </a>

        <a class="flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/20 block">
          <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.99m-1.626-.237a2.233 2.233 0 01-.829-.57m.83.377A2.233 2.233 0 0016 13h.06m.832.933l-.832 3.074A2.548 2.548 0 0114.5 17.5l-.376 1.6m-5.404 1.284l-.833-3.074A2.548 2.548 0 019.5 11l-.376-1.6m5.404-1.284L13.26 3.75a2.233 2.233 0 01.829-.57m-.83-.377A2.233 2.233 0 0010.5 4.28m.832-.933l.832-3.074A2.548 2.548 0 0115.5 6.5l.376 1.6m-5.404 1.284.833 3.074A2.548 2.548 0 0110.5 9.75l.376 1.6Z"/>
          </svg>
          <span>Sales</span>
        </a>

        <a class="flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent/20 block">
          <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.75 4.75h11.5a2 2 0 012 2v11a2 2 0 01-2 2H5.25m8.5-13h-11.5A2.25 2.25 0 002.5 4.75v11a2.25 2.25 0 002.25 2.25h11.5a2.25 2.25 0 002.25-2.25V4.75z"/>
          </svg>
          <span>Settings</span>
        </a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6 md:p-8 overflow-y-auto">
      <div>
        <h1 class="font-bold text-2xl">{@html heading}</h1>
        <p class="text-sm text-muted-foreground">{@html subtitle}</p>
      </div>

      <div class="flex items-center gap-3">
        <Button>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 3a1 1 0 011 1h11a1 1 0 110 2H4a1 1 0 01-1-1V3zm0 2h2v2H3V5zm0 6h2v2H3V11zm0 6h2v2H3V11zm0 6h2v2H3v-2zm0 6h2v2H3v-2zm0 6h2v2H3v-2z" />
          </svg>
          Add Product
        </Button>
      </div>
    </main>
  </div>
</div>

<style>
  .sidebar-sticky {
    @media (min-width: 768px) {
      position: sticky;
      top: 1rem;
    }
  }

  @media (max-width: 767px) {
    .sidebar-sticky {
      position: static;
      margin-bottom: 1rem;
    }
  }
</style>