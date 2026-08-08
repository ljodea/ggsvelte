<script lang="ts">
  /**
   * Object-form theme (light + no grid) lives in spec.ts only — theme-parity
   * requires hand-written plots to stay on string themes or use {spec}.
   * Spec-driven charts skip the GeomTile shell, so register the tile batch here (#1420).
   */
  import { GGPlot, Inspect, registerTile } from "@ggsvelte/svelte";

  registerTile();

  import spec from "./spec.js";
</script>

<!--
  1200×380 (not the default 640×400): a 53-week × 7-day calendar needs a wide,
  short frame so CoordFixed can keep each band cell square and large enough
  to read. Spec turns grid off so incomplete weeks are real holes.
-->
<GGPlot {spec} width={1200} height={380}>
  <Inspect mode="exact" pin />
</GGPlot>
