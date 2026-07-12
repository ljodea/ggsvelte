<script lang="ts">
  import GGPlotSceneFirst from "../../src/GGPlotSceneFirst.svelte";
  import GeomPoint from "../../src/GeomPoint.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    onRegistryCreated,
  }: { onRegistryCreated?: (r: LayerRegistry) => void } = $props();
</script>

<GGPlotSceneFirst {onRegistryCreated}>
  <GeomPoint label="a" />
  <GeomPoint label="b" />
</GGPlotSceneFirst>
