<script lang="ts">
  /**
   * <GeomPolygon> — declaration-only closed-polygon sugar for <GGPlot>
   * (vertices in data order per group; fill + optional outline). Same
   * contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, PolygonParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends PolygonParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("polygon", () => props, [
    "alpha",
    "linewidth",
    "fillPaint",
    "strokePaint",
    "glow",
  ]);
</script>
