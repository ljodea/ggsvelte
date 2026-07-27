<script lang="ts">
  /**
   * <GeomContour> — declaration-only contour isoline sugar for <GGPlot>
   * (stat contour: marching-squares over a regular x×y×z grid; #801).
   */
  import type { DataInput, AesInput, ContourParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends ContourParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("contour", () => props, [
    "bins",
    "binwidth",
    "breaks",
    "linewidth",
    "alpha",
  ]);
</script>
