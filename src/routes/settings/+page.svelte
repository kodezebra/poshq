<script lang="ts">
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
  import { getVatRate, setVatRate } from "$lib/db/settings";
  import { cart } from "$lib/stores/cart.svelte";
  import {
    cn,
    DEFAULT_VAT_RATE,
    formatUGX,
    VAT_RATES,
    type VatRate,
  } from "$lib/utils";

  let rate = $state<VatRate>(DEFAULT_VAT_RATE);
  let savedRate = $state<VatRate>(DEFAULT_VAT_RATE);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);

  const dirty = $derived(rate !== savedRate);
  const description = (value: VatRate) =>
    value === 0 ? "No tax is added to a sale." : "Standard rate, added on top.";

  onMount(async () => {
    try {
      const stored = await getVatRate();
      rate = stored;
      savedRate = stored;
      cart.setVatRate(stored);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  });

  async function save() {
    saving = true;
    error = null;

    try {
      await setVatRate(rate);
      savedRate = rate;
      cart.setVatRate(rate);
      toast.success(`VAT set to ${rate}%`, {
        description: "Applies to the open sale and new orders.",
      });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      toast.error("Could not save VAT rate");
    } finally {
      saving = false;
    }
  }
</script>

<div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
  <header>
    <p class="eyebrow text-ink-mute">Workspace</p>
    <h1 class="mt-1 text-display-lg text-ink">Settings</h1>
    <p class="mt-1 text-body-md text-ink-mute">
      How this register charges tax on a sale.
    </p>
  </header>

  <Card class="mt-6">
    <form
      onsubmit={(event) => {
        event.preventDefault();
        if (dirty && !saving) save();
      }}
    >
      <div class="flex items-start justify-between gap-6">
        <div>
          <h2 class="text-heading-sm text-ink">VAT rate</h2>
          <p class="mt-1 text-body-md text-ink-mute">
            Prices are VAT-exclusive. The rate is added on top of the cart
            subtotal, and each completed order keeps the rate it was charged at.
          </p>
        </div>
        {#if !loading}
          <span
            class="shrink-0 rounded-pill bg-primary/5 px-3 py-1 text-caption text-primary"
          >
            {savedRate}% active
          </span>
        {/if}
      </div>

      <fieldset class="mt-5 grid gap-3 sm:grid-cols-2" disabled={loading}>
        <legend class="sr-only">VAT rate</legend>
        {#each VAT_RATES as value (value)}
          <label
            class={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
              rate === value
                ? "border-primary bg-primary/5"
                : "border-hairline hover:bg-canvas-soft",
            )}
          >
            <input
              type="radio"
              name="vat-rate"
              {value}
              bind:group={rate}
              class="mt-1 size-4 accent-primary"
            />
            <span class="flex flex-col">
              <span class="text-body-md text-ink">{value}%</span>
              <span class="text-caption text-ink-mute">{description(value)}</span>
            </span>
          </label>
        {/each}
      </fieldset>

      <div
        class="mt-5 flex items-center justify-between gap-4 border-t border-hairline pt-4"
      >
        <p class="text-caption text-ink-mute">
          Open cart: VAT {rate}% =
          <span class="tnum text-ink">{formatUGX(cart.tax)}</span>
        </p>
        <Button type="submit" disabled={loading || saving || !dirty}>
          {saving ? "Saving…" : "Save VAT rate"}
        </Button>
      </div>

      {#if error}
        <p class="mt-3 text-body-md text-ruby" role="alert">{error}</p>
      {/if}
    </form>
  </Card>
</div>
