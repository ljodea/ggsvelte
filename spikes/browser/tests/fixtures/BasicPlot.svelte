<script lang="ts">
  import GGPlot from "../../src/GGPlot.svelte";
  import GeomPoint from "../../src/GeomPoint.svelte";
  import GeomLine from "../../src/GeomLine.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    onRegistryCreated,
  }: { onRegistryCreated?: (r: LayerRegistry) => void } = $props();
</script>

<GGPlot title="basic" {onRegistryCreated}>
  <GeomPoint label="a" alpha={0.6} />
  <GeomLine label="b" linewidth={2} />
  <GeomPoint label="c" alpha={0.9} />
</GGPlot>
