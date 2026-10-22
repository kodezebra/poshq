<script lang="ts">
  import { onMount, untrack } from "svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import Field from "$lib/components/ui/Field.svelte";
  import {
    productInputSchema,
    type Product,
    type ProductInput,
  } from "$lib/db/schema";
  import { parseUGX } from "$lib/utils";

  let {
    product = null,
    categories = [],
    submitting = false,
    oncancel,
    onsubmit,
  }: {
    product?: Product | null;
    categories?: string[];
    submitting?: boolean;
    oncancel: () => void;
    onsubmit: (input: ProductInput) => void | Promise<void>;
  } = $props();

  // The dialog remounts this form per open, so the initial product is the
  // intended starting point; `untrack` makes that explicit.
  let name = $state(untrack(() => product?.name ?? ""));
  let price = $state(untrack(() => (product ? String(product.price) : "")));
  let category = $state(untrack(() => product?.category ?? "General"));
  let sku = $state(untrack(() => product?.sku ?? ""));
  let errors = $state<Record<string, string>>({});

  onMount(() => {
    document.getElementById("product-name")?.focus();
  });

  function validate(): ProductInput | null {
    const result = productInputSchema.safeParse({
      name,
      price: parseUGX(price),
      category,
      sku: sku.trim() || null,
    });

    if (result.success) {
      errors = {};
      return result.data;
    }

    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      next[key] ??= issue.message;
    }

    errors = next;
    return null;
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (submitting) return;

    const input = validate();
    if (input) void onsubmit(input);
  }

  const errorFor = (field: string) => errors[field];
  const describedBy = (field: string) =>
    errorFor(field) ? `product-${field}-error` : undefined;
</script>

<form id="product-form" onsubmit={submit} novalidate>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="sm:col-span-2">
      <Field label="Name" for="product-name" error={errorFor("name")}>
        <Input
          id="product-name"
          bind:value={name}
          maxlength={120}
          aria-invalid={!!errorFor("name")}
          aria-describedby={describedBy("name")}
        />
      </Field>
    </div>

    <Field
      label="Price"
      for="product-price"
      hint="Whole shillings — no decimals."
      error={errorFor("price")}
    >
      <div class="relative">
        <span
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caption text-ink-mute"
        >
          UGX
        </span>
        <Input
          id="product-price"
          bind:value={price}
          class="tnum pl-11"
          inputmode="numeric"
          placeholder="3,500"
          aria-invalid={!!errorFor("price")}
          aria-describedby={describedBy("price")}
        />
      </div>
    </Field>

    <Field label="Category" for="product-category" error={errorFor("category")}>
      <Input
        id="product-category"
        bind:value={category}
        list="product-categories"
        maxlength={60}
        aria-invalid={!!errorFor("category")}
        aria-describedby={describedBy("category")}
      />
      <datalist id="product-categories">
        {#each categories as option (option)}
          <option value={option}></option>
        {/each}
      </datalist>
    </Field>

    <div class="sm:col-span-2">
      <Field
        label="SKU"
        for="product-sku"
        hint="Optional. Must be unique if set."
        error={errorFor("sku")}
      >
        <Input
          id="product-sku"
          bind:value={sku}
          maxlength={64}
          autocomplete="off"
          aria-invalid={!!errorFor("sku")}
          aria-describedby={describedBy("sku")}
        />
      </Field>
    </div>
  </div>

  {#if errors.form}
    <p class="mt-4 text-caption text-ruby" role="alert">{errors.form}</p>
  {/if}

  <div class="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
    <Button variant="secondary" type="button" onclick={oncancel}>
      Cancel
    </Button>
    <Button type="submit" disabled={submitting}>
      {submitting
        ? "Saving…"
        : product
          ? "Save changes"
          : "Add product"}
    </Button>
  </div>
</form>
