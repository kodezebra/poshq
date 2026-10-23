<script lang="ts">
  import { onMount } from "svelte";
  import { Check } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import { getVatRate, setVatRate } from "$lib/db/settings";
  import { cart } from "$lib/stores/cart.svelte";
  import {
    cn,
    DEFAULT_VAT_RATE,
    errorMessage,
    formatUGX,
    VAT_RATES,
    type VatRate,
  } from "$lib/utils";

  let rate = $state<VatRate>(DEFAULT_VAT_RATE);
  let loading = $state(true);
  /** The stored rate has been read, so the control can be trusted. */
  let ready = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  const description = (value: VatRate) =>
    value === 0 ? "No tax is added to a sale." : "Standard rate, added on top.";

  async function load() {
    loading = true;
    error = null;

    try {
      const stored = await getVatRate();
      rate = stored;
      cart.setVatRate(stored);
      ready = true;
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void load();
  });

  // Choosing a rate is the save action: one less control on screen.
  async function choose(value: VatRate) {
    if (!ready || value === rate || saving) return;

    const previous = rate;
    rate = value;
    cart.setVatRate(value);
    saving = true;
    error = null;

    try {
      await setVatRate(value);
      toast.success(`VAT set to ${value}%`, {
        description: "Applies to the open sale and new orders.",
      });
    } catch (cause) {
      rate = previous;
      cart.setVatRate(previous);
      error = errorMessage(cause);
      toast.error("Could not save VAT rate");
    } finally {
      saving = false;
    }
  }
</script>

<div class="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6">
  <PageHeader eyebrow="Workspace" title="Settings">
    <p>How this register charges tax on a sale.</p>
  </PageHeader>

  <Card class="mt-4">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-heading-sm text-ink">VAT rate</h2>
        <p class="mt-1 text-caption text-ink-mute">
          Prices are VAT-exclusive. The rate is added on top of the cart
          subtotal, and each completed order keeps the rate it was charged at.
        </p>
      </div>
      {#if saving}
        <span class="shrink-0 text-caption text-ink-mute" aria-live="polite">
          Saving…
        </span>
      {/if}
    </div>

    {#if loading}
      <div
        class="mt-4 h-9 w-56 animate-pulse rounded-sm bg-canvas-sunken"
        aria-hidden="true"
      ></div>
    {:else if ready}
      <fieldset class="mt-4" disabled={saving}>
        <legend class="sr-only">VAT rate</legend>
        <div class="inline-flex items-center gap-1">
          {#each VAT_RATES as value (value)}
            <label
              class={cn(
                "flex h-9 cursor-pointer items-center gap-1.5 rounded-sm px-4 text-button-sm transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                rate === value
                  ? "bg-primary-subdued text-primary-deep"
                  : "text-ink-secondary hover:bg-canvas-sunken hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="vat-rate"
                {value}
                checked={rate === value}
                onchange={() => choose(value)}
                class="sr-only"
              />
              <span
                class={cn(
                  "flex size-3.5 items-center justify-center",
                  rate === value ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              >
                <Check class="size-3.5" />
              </span>
              {value}%
            </label>
          {/each}
        </div>
        <p class="mt-2 text-caption text-ink-mute">{description(rate)}</p>
      </fieldset>

      <p class="mt-4 border-t border-hairline pt-3 text-caption text-ink-mute">
        {#if cart.isEmpty}
          No open sale. The rate applies to the next order.
        {:else}
          Open cart: VAT {rate}% =
          <span class="tnum text-ink">{formatUGX(cart.tax)}</span>
        {/if}
      </p>
    {:else}
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <p class="text-body-md text-danger" role="alert">{error}</p>
        <Button variant="secondary" size="sm" onclick={load}>
          Try again
        </Button>
      </div>
    {/if}

    {#if error && ready}
      <p class="mt-3 text-body-md text-danger" role="alert">{error}</p>
    {/if}
  </Card>
</div>
