<script lang="ts" generics="T extends string = string">
  import { ChevronDown } from "@lucide/svelte";
  import { cn } from "$lib/utils";

  type SelectOption<T> = {
    value: T;
    label: string;
  };

  let {
    value = $bindable("" as T),
    options,
    placeholder,
    class: className,
    ...rest
  }: {
    value?: T;
    options: SelectOption<T>[];
    placeholder?: string;
    class?: string;
    [key: string]: unknown;
  } = $props();
</script>

<div class="relative">
  <select
    bind:value
    class={cn(
      "h-10 w-full appearance-none rounded-sm border border-hairline-input bg-canvas pl-3 pr-9 text-body-md text-ink outline-none",
      "transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/15",
      "disabled:cursor-not-allowed disabled:bg-canvas-soft disabled:opacity-60",
      className,
    )}
    {...rest}
  >
    {#if placeholder}
      <option value="" disabled>{placeholder}</option>
    {/if}
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>

  <ChevronDown
    class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute"
  />
</div>
