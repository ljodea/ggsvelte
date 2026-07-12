<script lang="ts">
  import GGPlot from "../../src/GGPlot.svelte";
  import GeomPoint from "../../src/GeomPoint.svelte";
  import GeomLine from "../../src/GeomLine.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    alpha = 0.5,
    onRegistryCreated,
  }: { alpha?: number; onRegistryCreated?: (r: LayerRegistry) => void } =
    $props();
</script>

<GGPlot title="reactive" {onRegistryCreated}>
  <GeomPoint label="p" {alpha} />
  <GeomLine label="l" linewidth={3} />
</GGPlot>
