<script lang="ts">
  /**
   * <GeomQuantile> — declaration-only linear quantile-regression lines for
   * <GGPlot> (stat quantile: y ~ x at each τ; #805). Same contract and
   * z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, QuantileParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends QuantileParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("quantile", () => props, [
    "quantiles",
    "n",
    "linewidth",
    "alpha",
    "strokePaint",
    "glow",
  ]);
</script>
