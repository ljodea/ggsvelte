<script lang="ts">
  /**
   * <GeomMap> — declaration-only fortified map join for <GGPlot>
   * (value table map_id ↔ params.map region borders; #808). Same
   * contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, MapParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends MapParams {
    /** Optional layer-local value data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("map", () => props, [
    "map",
    "mapId",
    "alpha",
    "linewidth",
    "fillPaint",
    "strokePaint",
    "glow",
  ]);
</script>
