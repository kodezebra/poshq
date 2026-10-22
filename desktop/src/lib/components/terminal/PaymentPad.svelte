<script lang="ts">
  import { Banknote, CreditCard } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import {
    changeDue,
    quickCash,
    shortfall,
    type PaymentMethod,
  } from "$lib/payment";
  import { cn, formatUGX, parseUGX } from "$lib/utils";

  let {
    total,
    charging = false,
    onconfirm,
  }: {
    total: number;
    charging?: boolean;
    onconfirm: (payment: { method: PaymentMethod; tendered: number }) => void;
  } = $props();

  let method = $state<PaymentMethod>("cash");
  let tenderedText = $state("");

  /**
   * An empty box means the customer handed over the exact amount, so the pad
   * follows the sale while the cashier is still building it. Once an amount is
   * typed it stands until it is cleared.
   */
  const tendered = $derived(
    tenderedText.trim() === "" ? total : parseUGX(tenderedText),
  );
  const change = $derived(changeDue(total, tendered));
  const short = $derived(shortfall(total, tendered));
  const notes = $derived(method === "cash" ? quickCash(total) : []);
  const blocked = $derived(short > 0);

  const METHODS: Array<{ id: PaymentMethod; label: string }> = [
    { id: "cash", label: "Cash" },
    { id: "card", label: "Card" },
  ];

  function choose(option: PaymentMethod) {
    method = option;
    tenderedText = "";
  }
</script>

<div class="space-y-3">
  <div class="flex gap-2" role="group" aria-label="Payment method">
    {#each METHODS as option (option.id)}
      <button
        type="button"
        aria-pressed={method === option.id}
        onclick={() => choose(option.id)}
        class={cn(
          "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-sm px-4 text-button-sm transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          method === option.id
            ? "border border-primary bg-primary/5 text-primary"
            : "border border-hairline-input bg-canvas text-ink-secondary hover:bg-canvas-sunken",
        )}
      >
        {#if option.id === "cash"}
          <Banknote class="size-4" />
        {:else}
          <CreditCard class="size-4" />
        {/if}
        {option.label}
      </button>
    {/each}
  </div>

  {#if method === "cash"}
    <div class="space-y-2">
      <div class="flex items-end gap-2">
        <div class="min-w-0 flex-1">
          <label
            for="tendered"
            class="block text-caption text-ink-secondary">Tendered</label
          >
          <div class="relative mt-1.5">
            <span
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-md text-ink-mute"
              >USh</span
            >
            <Input
              id="tendered"
              inputmode="numeric"
              autocomplete="off"
              class="tnum pl-11"
              placeholder={String(total)}
              bind:value={tenderedText}
            />
          </div>
        </div>
        <Button
          variant="secondary"
          size="md"
          onclick={() => (tenderedText = String(total))}
        >
          Exact
        </Button>
      </div>

      {#if notes.length}
        <div class="flex flex-wrap gap-2">
          {#each notes as note (note)}
            <Button
              variant="secondary"
              size="sm"
              class="tnum"
              onclick={() => (tenderedText = String(note))}
            >
              {formatUGX(note)}
            </Button>
          {/each}
        </div>
      {/if}

      <p
        class="text-body-md"
        class:text-ruby={short > 0}
        class:text-ink={short === 0 && change > 0}
        class:text-ink-mute={short === 0 && change === 0}
        aria-live="polite"
      >
        {#if short > 0}
          Short by {formatUGX(short)}
        {:else if change > 0}
          Change due {formatUGX(change)}
        {:else}
          Exact amount
        {/if}
      </p>
    </div>
  {:else}
    <p class="text-body-md text-ink-mute">
      Card payment of {formatUGX(total)} — no change is given.
    </p>
  {/if}

  <Button
    class="w-full"
    disabled={blocked || charging}
    onclick={() => onconfirm({ method, tendered })}
  >
    {charging
      ? "Charging…"
      : method === "cash" && change > 0
        ? `Give change ${formatUGX(change)}`
        : `Charge ${formatUGX(total)}`}
  </Button>
</div>
