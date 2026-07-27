<script lang="ts">
  /**
   * <GeomDensity2d> — declaration-only 2D KDE isoline sugar for <GGPlot>
   * (stat density_2d; #802). v1 draws open path contours only.
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
  createGeomLayer("density_2d", () => props, [
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
