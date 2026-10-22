<script lang="ts">
  import "../app.css";
  import { Toaster } from "svelte-sonner";
  import AppShell from "$lib/components/layout/AppShell.svelte";

  let { children } = $props();
</script>

<AppShell>
  {@render children()}
</AppShell>

<Toaster position="top-center" theme="light" richColors closeButton />
