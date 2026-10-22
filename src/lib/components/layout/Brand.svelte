<script lang="ts">
  import { Store } from "@lucide/svelte";
</script>

<a
  href="/dashboard"
  class="group flex items-center gap-2.5 rounded-sm"
  aria-label="Posh — point of sale"
>
  <span
    class="flex size-8 items-center justify-center rounded-md bg-primary text-on-primary transition-colors group-hover:bg-primary-deep"
  >
    <Store class="size-4" />
  </span>
  <span class="text-heading-sm text-ink">
    Posh<span class="text-primary">.</span>
  </span>
</a>
