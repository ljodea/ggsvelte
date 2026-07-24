<script lang="ts">
  /**
   * Child that registerPlotLayer's a full Layer during component init
   * (and unregisters on destroy). Used by PlotLayerRegistryPair / stress harness.
   */
  import { untrack } from "svelte";

  import { registerPlotLayer, type Layer } from "../../src/lib/index.js";

  const {
    layer,
  }: {
    layer: Layer;
  } = $props();

  registerPlotLayer(untrack(() => layer));
</script>
