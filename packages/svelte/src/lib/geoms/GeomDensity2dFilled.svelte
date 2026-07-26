<script lang="ts">
  /**
   * <GeomDensity2dFilled> — filled 2D KDE rings for <GGPlot>
   * (stat density_2d_filled; #802 phase 2). Closed isoline rings only.
   */
  import type { DataInput, AesInput, Density2dParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends Density2dParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("density_2d_filled", () => props, [
    "h",
    "adjust",
    "n",
    "bins",
    "binwidth",
    "breaks",
    "linewidth",
    "alpha",
  ]);
</script>
