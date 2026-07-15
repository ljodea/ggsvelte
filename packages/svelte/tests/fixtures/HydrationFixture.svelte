<script lang="ts">
  import { onMount } from "svelte";

  let { label, count = 0 }: { label: string; count?: number } = $props();
  let hydrated = $state(false);

  onMount(() => {
    hydrated = true;
  });
</script>

<button data-hydrated={String(hydrated)} onclick={() => count++}
  >{label}: {count}</button
>
