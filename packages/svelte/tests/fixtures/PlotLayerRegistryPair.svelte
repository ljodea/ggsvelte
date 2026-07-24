<script lang="ts">
  /**
   * Parent/child harness for provideRegistry + registerLayer / registerPlotLayer.
   * Mirrors RegistryPair for the widened Layer union.
   */
  import { untrack } from "svelte";

  import {
    provideRegistry,
    type Layer,
    type LayerDescriptor,
    type LayerRegistry,
  } from "../../src/lib/geoms/registry.svelte.js";
  import RegistryLayerChild from "./RegistryLayerChild.svelte";
  import PlotLayerRegisterChild from "./PlotLayerRegisterChild.svelte";

  const {
    marks = [],
    plotLayers = [],
    capture,
  }: {
    marks?: readonly LayerDescriptor[];
    plotLayers?: readonly Layer[];
    capture?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  untrack(() => capture?.(registry));
</script>

{#each marks as descriptor, i (i)}
  <RegistryLayerChild {descriptor} />
{/each}
{#each plotLayers as layer, i (i)}
  <PlotLayerRegisterChild {layer} />
{/each}
