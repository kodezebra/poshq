<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    value = $bindable(""),
    class: className,
    ...rest
  }: {
    value?: string;
    class?: string;
    [key: string]: unknown;
  } = $props();
</script>

<input
  bind:value
  class={cn(
    "h-10 w-full rounded-sm border border-hairline-input bg-canvas px-3 text-body-md text-ink outline-none",
    "transition-[border-color,box-shadow] placeholder:text-ink-mute",
    "focus:border-primary focus:ring-2 focus:ring-primary/15",
    "disabled:cursor-not-allowed disabled:bg-canvas-soft disabled:opacity-60",
    className,
  )}
  {...rest}
/>
