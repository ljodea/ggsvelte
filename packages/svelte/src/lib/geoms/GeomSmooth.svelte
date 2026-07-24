<script lang="ts">
  /**
   * <GeomSmooth> — declaration-only fitted-trend sugar for <GGPlot>
   * (stat smooth: lm or loess per group, se ribbon at level 0.95 by
   * default; requires quantitative x and y). Same contract and z-order
   * constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, SmoothParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SmoothParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("smooth", () => props, [
    "method",
    "se",
    "level",
    "span",
    "degree",
    "n",
    "linewidth",
    "alpha",
  ]);
</script>
