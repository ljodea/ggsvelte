<script lang="ts">
  /**
   * Orphan createPlotLayer call — no provideRegistry ancestor. Must no-op.
   */
  import { createPlotLayer } from "../../src/lib/layers/plot-layer.svelte.js";

  createPlotLayer("labs", () => ({ title: "orphan" }));
</script>
