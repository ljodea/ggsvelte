<script lang="ts">
  /**
   * <GeomRaster> — declaration-only raster sugar for <GGPlot>. Equal-cell grid
   * at (x, y) with fill; no per-cell stroke. Irregular spacing warns and
   * suggests geom tile. Same z-order contract as other geoms (decision 0001).
   */
  import type { DataInput, AesInput, RasterParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends RasterParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("raster", () => props, [
    "alpha",
    "hjust",
    "vjust",
    "interpolate",
  ]);
</script>
