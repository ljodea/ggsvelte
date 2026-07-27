<script lang="ts">
  /**
   * <GeomDotplot> — declaration-only histodot stacked-dot sugar for <GGPlot>
   * (stat bindot; continuous aes.x only; #803). Same contract and z-order
   * constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, DotplotParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends DotplotParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("dotplot", () => props, [
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
    "stackdir",
    "stackratio",
    "dotsize",
    "size",
    "alpha",
    "shape",
  ]);
</script>
