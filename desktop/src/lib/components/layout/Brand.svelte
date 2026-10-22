<script lang="ts">
  import { Store } from "@lucide/svelte";
</script>

<a
  href="/"
  class="group flex items-center gap-2.5 rounded-sm"
  aria-label="Posh — point of sale"
>
  <span
    class="flex size-7 items-center justify-center rounded-sm bg-chrome-raised text-chrome-ink ring-1 ring-chrome-line ring-inset transition-colors group-hover:text-action-on-chrome"
  >
    <Store class="size-4" />
  </span>
  <span class="text-heading-sm text-chrome-ink">
    Posh<span class="text-action-on-chrome">.</span>
  </span>
</a>
