<script lang="ts">
  /**
   * <GeomSf> — declaration-only simple-features geometry for <GGPlot>
   * (portable GeoJSON Geometry JSON strings; #809 phase 1). Same
   * contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, SfParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SfParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("sf", () => props, [
    "geometry",
    "alpha",
    "linewidth",
    "size",
    "fillPaint",
    "strokePaint",
    "glow",
  ]);
</script>
