<script lang="ts">
  import GGPlot from "../../src/GGPlot.svelte";
  import GeomPoint from "../../src/GeomPoint.svelte";
  import GeomLine from "../../src/GeomLine.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    onFirstRegistry,
    onSecondRegistry,
  }: {
    onFirstRegistry?: (r: LayerRegistry) => void;
    onSecondRegistry?: (r: LayerRegistry) => void;
  } = $props();
</script>

<GGPlot title="first" onRegistryCreated={onFirstRegistry}>
  <GeomPoint label="first-a" alpha={0.1} />
  <GeomPoint label="first-b" alpha={0.2} />
</GGPlot>

<GGPlot title="second" onRegistryCreated={onSecondRegistry}>
  <GeomLine label="second-a" linewidth={4} />
</GGPlot>
