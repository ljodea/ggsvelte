<script lang="ts">
  /**
   * <GeomPath> — declaration-only path-layer sugar for <GGPlot>.
   * Connects points in data order (no x-sort), unlike <GeomLine> (#788).
   */
  import type { DataInput, AesInput, PathParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends PathParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /**
     * identity (default) | unique (#813) | connect (named joins; #816).
     */
    stat?: "identity" | "unique" | "connect";
  }

  const props: Props = $props();
  createGeomLayer("path", () => props, ["alpha", "linewidth", "curve", "connection"]);
</script>
