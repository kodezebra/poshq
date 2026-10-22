<script lang="ts">
  import Badge from "$lib/components/ui/Badge.svelte";
  import type { OrderStatus } from "$lib/db/orders";

  let { status }: { status: OrderStatus } = $props();

  const labels: Record<OrderStatus, string> = {
    completed: "Completed",
    void: "Void",
  };
</script>

<Badge variant={status === "completed" ? "success" : "danger"}>
  {labels[status]}
</Badge>
