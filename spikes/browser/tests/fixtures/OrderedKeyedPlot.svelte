<script lang="ts">
  import GGPlotOrdered from "../../src/ordered/GGPlotOrdered.svelte";
  import GeomPointMarked from "../../src/ordered/GeomPointMarked.svelte";
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

<GGPlotOrdered title="ordered-keyed" {onRegistryCreated}>
  {#each items as item (item.id)}
    <GeomPointMarked label={item.id} alpha={item.alpha} />
  {/each}
</GGPlotOrdered>
