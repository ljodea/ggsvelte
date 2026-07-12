<script lang="ts">
  import GGPlot from "../../src/GGPlot.svelte";
  import GeomPoint from "../../src/GeomPoint.svelte";
  import GeomLine from "../../src/GeomLine.svelte";
  import type { LayerRegistry } from "../../src/registry.svelte.js";

  let {
    show = true,
    onRegistryCreated,
  }: { show?: boolean; onRegistryCreated?: (r: LayerRegistry) => void } =
    $props();
</script>

<GGPlot title="toggle" {onRegistryCreated}>
  <GeomPoint label="a" />
  {#if show}
    <GeomLine label="b" />
  {/if}
  <GeomPoint label="c" />
</GGPlot>
