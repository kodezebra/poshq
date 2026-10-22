<script lang="ts">
  import {
    LayoutGrid,
    LayoutList,
    PackageSearch,
    Plus,
    RefreshCw,
    SearchX,
    Settings2,
    Trash2,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import ActionMenu from "$lib/components/ui/ActionMenu.svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import ProductCard from "$lib/components/product-card/ProductCard.svelte";
  import ProductForm from "$lib/components/product-form/ProductForm.svelte";
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import {
    createProduct,
    deleteProduct,
    listProducts,
    updateProduct,
  } from "$lib/db/products";
  import type { Product, ProductInput } from "$lib/db/schema";
  import { cart } from "$lib/stores/cart.svelte";
  import { cn, errorMessage, formatUGX } from "$lib/utils";

  let search = $state("");
  let query = $state("");
  let reloadKey = $state(0);
  let products = $state<Product[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let layout = $state<"list" | "grid">("list");

  let formOpen = $state(false);
  let editing = $state<Product | null>(null);
  let saving = $state(false);

  let deleteOpen = $state(false);
  let deleting = $state<Product | null>(null);
  let deletingBusy = $state(false);

  const categories = $derived(
    [...new Set(products.map((product) => product.category))].sort(),
  );

  // Debounce typing so each keystroke doesn't hit SQLite.
  $effect(() => {
    const term = search;
    const timer = setTimeout(() => {
      query = term.trim();
    }, 200);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const term = query;
    void reloadKey;

    let cancelled = false;
    loading = true;
    error = null;

    listProducts({ search: term })
      .then((rows) => {
        if (!cancelled) products = rows;
      })
      .catch((cause: unknown) => {
        if (!cancelled) error = errorMessage(cause);
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  function openCreate() {
    editing = null;
    formOpen = true;
  }

  function openEdit(product: Product) {
    editing = product;
    formOpen = true;
  }

  function askDelete(product: Product) {
    deleting = product;
    deleteOpen = true;
  }

  async function save(input: ProductInput) {
    saving = true;

    try {
      if (editing) {
        await updateProduct(editing.id, input);
        toast.success("Product updated");
      } else {
        await createProduct(input);
        toast.success("Product added");
      }

      formOpen = false;
      editing = null;
      reloadKey++;
    } catch (cause) {
      toast.error(editing ? "Could not update product" : "Could not add product", {
        description: errorMessage(cause),
      });
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!deleting || deletingBusy) return;

    const target = deleting;
    const inCart = cart.lines.some((line) => line.productId === target.id);
    deletingBusy = true;

    try {
      await deleteProduct(target.id);
      cart.remove(target.id);

      toast.success(`${target.name} deleted`, {
        description: inCart ? "Also removed from the open sale." : undefined,
      });

      deleteOpen = false;
      deleting = null;
      reloadKey++;
    } catch (cause) {
      toast.error("Could not delete product", {
        description: errorMessage(cause),
      });
    } finally {
      deletingBusy = false;
    }
  }
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
  <PageHeader eyebrow="Catalog" title="Products">
    <p aria-live="polite">
      {#if loading}
        Loading the catalog…
      {:else}
        {products.length}
        {products.length === 1 ? "item" : "items"}
        {query ? "matching your search" : "available on this register"}.
      {/if}
    </p>

    {#snippet actions()}
      <div class="w-full sm:w-64">
        <Input
          bind:value={search}
          placeholder="Search name, SKU or category…"
          aria-label="Search products"
          class="h-9"
        />
      </div>

      <div
        class="flex shrink-0 items-center gap-0.5 rounded-md border border-hairline p-0.5"
        role="group"
        aria-label="Catalog layout"
      >
        <button
          type="button"
          aria-pressed={layout === "list"}
          aria-label="List view"
          title="List view"
          onclick={() => (layout = "list")}
          class={cn(
            "inline-flex size-8 items-center justify-center rounded-sm transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            layout === "list"
              ? "bg-canvas-soft text-ink"
              : "text-ink-mute hover:text-ink",
          )}
        >
          <LayoutList class="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={layout === "grid"}
          aria-label="Grid view"
          title="Grid view"
          onclick={() => (layout = "grid")}
          class={cn(
            "inline-flex size-8 items-center justify-center rounded-sm transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            layout === "grid"
              ? "bg-canvas-soft text-ink"
              : "text-ink-mute hover:text-ink",
          )}
        >
          <LayoutGrid class="size-4" />
        </button>
      </div>

      <Button size="sm" onclick={openCreate}>
        <Plus class="size-4" />
        Add product
      </Button>
    {/snippet}
  </PageHeader>

  {#if error}
    <EmptyState
      class="mt-4"
      title="Could not load products"
      description={error}
    >
      {#snippet icon()}
        <RefreshCw class="size-6" />
      {/snippet}
      {#snippet actions()}
        <Button variant="secondary" size="sm" onclick={() => reloadKey++}>
          <RefreshCw class="size-4" />
          Try again
        </Button>
      {/snippet}
    </EmptyState>
  {:else if loading}
    <div
      class="mt-4 h-72 animate-pulse rounded-lg border border-hairline bg-canvas-soft"
      aria-busy="true"
    ></div>
  {:else if products.length}
    {#if layout === "list"}
      <ul
        class="mt-4 divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-canvas"
      >
        {#each products as product (product.id)}
          <li
            class="group relative flex items-center gap-4 px-3 py-2 transition-colors hover:bg-canvas-soft"
          >
            <button
              type="button"
              onclick={() => openEdit(product)}
              class="min-w-0 flex-1 text-left after:absolute after:inset-0 focus-visible:outline-none"
              aria-label={`Edit ${product.name}`}
            >
              <span class="block truncate text-body-md text-ink">
                {product.name}
              </span>
            </button>

            <span
              class="hidden w-48 shrink-0 truncate text-caption text-ink-mute sm:block"
            >
              {product.category}{#if product.sku} · {product.sku}{/if}
            </span>

            <span class="tnum w-24 shrink-0 text-right text-body-md text-ink">
              {formatUGX(product.price)}
            </span>

            <div class="relative z-10">
              <ActionMenu
                label={`Actions for ${product.name}`}
                items={[
                  {
                    label: "Edit product",
                    icon: Settings2,
                    onselect: () => openEdit(product),
                  },
                  {
                    label: "Delete product",
                    icon: Trash2,
                    destructive: true,
                    onselect: () => askDelete(product),
                  },
                ]}
              />
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <ul
        class="mt-4 grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]"
      >
        {#each products as product (product.id)}
          <li>
            <ProductCard {product}>
              {#snippet actions()}
                <ActionMenu
                  label={`Actions for ${product.name}`}
                  items={[
                    {
                      label: "Edit product",
                      icon: Settings2,
                      onselect: () => openEdit(product),
                    },
                    {
                      label: "Delete product",
                      icon: Trash2,
                      destructive: true,
                      onselect: () => askDelete(product),
                    },
                  ]}
                />
              {/snippet}
            </ProductCard>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if query}
    <EmptyState
      class="mt-4"
      title={`No products match “${query}”`}
      description="Try a different name, SKU or category."
    >
      {#snippet icon()}
        <SearchX class="size-6" />
      {/snippet}
      {#snippet actions()}
        <Button
          variant="secondary"
          size="sm"
          onclick={() => {
            search = "";
            query = "";
          }}
        >
          Clear search
        </Button>
      {/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      class="mt-4"
      title="No products yet"
      description="Add your first product to start selling."
    >
      {#snippet icon()}
        <PackageSearch class="size-6" />
      {/snippet}
      {#snippet actions()}
        <Button size="sm" onclick={openCreate}>
          <Plus class="size-4" />
          Add product
        </Button>
      {/snippet}
    </EmptyState>
  {/if}
</div>

<Dialog
  bind:open={formOpen}
  title={editing ? "Edit product" : "Add product"}
  description={editing
    ? "Changes apply to new sales. Past orders keep their snapshots."
    : "New products appear on the terminal right away."}
>
  <ProductForm
    product={editing}
    {categories}
    submitting={saving}
    oncancel={() => (formOpen = false)}
    onsubmit={save}
  />
</Dialog>

<Dialog
  bind:open={deleteOpen}
  title="Delete product?"
  description={deleting
    ? `“${deleting.name}” will be removed from the catalog.`
    : undefined}
>
  <p class="text-body-md text-ink-mute">
    Past orders keep the name and price they were sold at. This cannot be
    undone.
  </p>

  <div class="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
    <Button variant="secondary" type="button" onclick={() => (deleteOpen = false)}>
      Cancel
    </Button>
    <Button
      variant="danger"
      type="button"
      onclick={confirmDelete}
      disabled={deletingBusy}
    >
      {deletingBusy ? "Deleting…" : "Delete product"}
    </Button>
  </div>
</Dialog>
