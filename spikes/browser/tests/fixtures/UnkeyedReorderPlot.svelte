<script lang="ts">
  import GGPlot from "../../src/GGPlot.svelte";
  import GeomPoint from "../../src/GeomPoint.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  interface Item {
    id: string;
    alpha: number;
  }

  let {
    items = [],
    onRegistryCreated,
  }: { items?: Item[]; onRegistryCreated?: (r: LayerRegistry) => void } =
    $props();
</script>

<GGPlot title="unkeyed" {onRegistryCreated}>
  {#each items as item}
    <GeomPoint label={item.id} alpha={item.alpha} />
  {/each}
</GGPlot>
