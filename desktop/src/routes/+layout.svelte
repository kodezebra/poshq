<script lang="ts">
  import "../app.css";
  import { Toaster } from "svelte-sonner";
  import AppShell from "$lib/components/layout/AppShell.svelte";
  import ConnectionGate from "$lib/components/layout/ConnectionGate.svelte";

  let { children } = $props();
</script>

<ConnectionGate>
  <AppShell>
    {@render children()}
  </AppShell>
</ConnectionGate>

<Toaster position="top-center" theme="light" richColors closeButton />
