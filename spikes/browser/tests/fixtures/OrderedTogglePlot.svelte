<script lang="ts">
  import GGPlotOrdered from "../../src/ordered/GGPlotOrdered.svelte";
  import GeomPointMarked from "../../src/ordered/GeomPointMarked.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    show = true,
    onRegistryCreated,
  }: { show?: boolean; onRegistryCreated?: (r: LayerRegistry) => void } =
    $props();
</script>

<GGPlotOrdered title="ordered-toggle" {onRegistryCreated}>
  <GeomPointMarked label="a" />
  {#if show}
    <GeomPointMarked label="b" />
  {/if}
  <GeomPointMarked label="c" />
</GGPlotOrdered>
