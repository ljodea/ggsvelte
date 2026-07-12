<script lang="ts">
  import GGPlotOrdered from "../../src/ordered/GGPlotOrdered.svelte";
  import GeomPointMarked from "../../src/ordered/GeomPointMarked.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    onRegistryCreated,
  }: { onRegistryCreated?: (r: LayerRegistry) => void } = $props();
</script>

<GGPlotOrdered title="ordered-basic" {onRegistryCreated}>
  <GeomPointMarked label="a" alpha={0.1} />
  <GeomPointMarked label="b" alpha={0.2} />
  <GeomPointMarked label="c" alpha={0.3} />
</GGPlotOrdered>
