<script lang="ts">
  /**
   * <GeomRug> — declaration-only rug-layer sugar for <GGPlot>.
   * Marginal ticks along panel edges (ggplot2 geom_rug; #806).
   */
  import type { DataInput, AesInput, RugParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends RugParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("rug", () => props, [
    "alpha",
    "linewidth",
    "sides",
    "length",
  ]);
</script>
