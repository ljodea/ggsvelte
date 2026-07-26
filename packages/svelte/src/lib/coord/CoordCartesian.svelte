<script lang="ts">
  /**
   * <CoordCartesian> — declaration-only default Cartesian layer for <GGPlot>
   * (#659 slice 5). Registers `{ type: "cartesian" }`, which normalize() drops
   * when bare (no other keys). Useful mid-migration under REPLACE so a child
   * can clear a prior `coord="flip"` prop. Emits NO markup.
   */
  import { createPlotLayer } from "../layers/plot-layer.svelte.js";

  createPlotLayer("coord", () => ({ type: "cartesian" }));
</script>
