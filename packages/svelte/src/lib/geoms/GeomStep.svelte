<script lang="ts">
  /**
   * <GeomStep> — declaration-only step-line sugar for <GGPlot>.
   * ggplot2 geom_step: direction "hv" | "vh" | "mid" (default hv).
   * Same z-order contract as <GeomLine> (decision 0001).
   */
  import type { DataInput, AesInput, StepParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends StepParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("step", () => props, ["alpha", "linewidth", "direction"]);
</script>
