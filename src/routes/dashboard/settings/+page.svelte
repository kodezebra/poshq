<script lang="ts">
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
  import Input from "$lib/components/input/Input.svelte";

  let storeName = $state("Posh — Downtown");
  let currency = $state("USD");
  let taxRate = $state("8.5");

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
  }
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header>
    <p class="eyebrow text-ink-mute">Workspace</p>
    <h1 class="mt-1 text-display-lg text-ink">Settings</h1>
    <p class="mt-1 text-body-md text-ink-mute">
      How this register identifies itself on receipts.
    </p>
  </header>

  <Card class="mt-6 max-w-2xl">
    <form class="flex flex-col gap-5" onsubmit={handleSubmit}>
      <div class="flex flex-col gap-1.5">
        <label for="store-name" class="text-caption text-ink">Store name</label>
        <Input id="store-name" bind:value={storeName} />
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label for="currency" class="text-caption text-ink">Currency</label>
          <Input id="currency" bind:value={currency} />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="tax-rate" class="text-caption text-ink">Tax rate (%)</label>
          <Input id="tax-rate" bind:value={taxRate} inputmode="decimal" />
        </div>
      </div>

      <div class="flex justify-end border-t border-hairline pt-5">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  </Card>
</div>
