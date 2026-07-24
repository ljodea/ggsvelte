<script lang="ts">
  /**
   * Reads the LayerRegistry from GGPlot context and hands it to the test.
   */
  import { untrack } from "svelte";

  import {
    getLayerRegistry,
    type LayerRegistry,
  } from "../../src/lib/geoms/registry.svelte.js";

  const {
    capture,
  }: {
    capture: (registry: LayerRegistry) => void;
  } = $props();

  const registry = getLayerRegistry();
  if (registry !== undefined) {
    untrack(() => capture(registry));
  }
</script>
