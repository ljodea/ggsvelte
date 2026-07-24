<script lang="ts">
  /**
   * <GeomTile> — declaration-only tile sugar for <GGPlot>. Center-sized cells
   * at (x, y) with optional width/height (params or aes). Supports fill and
   * stroke outlines. Same z-order contract as other geoms (decision 0001).
   */
  import type { DataInput, AesInput, TileParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends TileParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("tile", () => props, [
    "width",
    "height",
    "alpha",
    "linewidth",
  ]);
</script>
