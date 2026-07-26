<script lang="ts">
  /**
   * <GeomFreqpoly> — declaration-only frequency-polygon sugar for <GGPlot>
   * (ggplot2 geom_freqpoly; canonicalized to line + stat bin). Map continuous
   * aes.x only; y is computed by the bin stat. Same z-order contract as
   * <GeomPoint> (decision 0001).
   */
  import type { AesInput, DataInput, LineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends LineParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("freqpoly", () => props, [
    "alpha",
    "linewidth",
    "curve",
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
  ]);
</script>
