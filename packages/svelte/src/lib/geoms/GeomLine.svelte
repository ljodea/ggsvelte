<script lang="ts">
  /**
   * <GeomLine> — declaration-only line-layer sugar for <GGPlot>.
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, LineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends LineParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /**
     * identity | unique (#813) | bin (freqpoly; #796) |
     * align (shared continuous-x grid for stack/fill; #815).
     */
    stat?: "identity" | "unique" | "bin" | "align";
  }

  const props: Props = $props();
  createGeomLayer("line", () => props, [
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
