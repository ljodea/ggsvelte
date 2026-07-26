<script lang="ts">
  /**
   * <GeomPath> — declaration-only path-layer sugar for <GGPlot>.
   * Connects points in data order (no x-sort), unlike <GeomLine> (#788).
   */
  import type { DataInput, AesInput, LineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends LineParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** "identity" (default) or "unique" (first-wins aesthetic dedupe; #813). */
    stat?: "identity" | "unique";
  }

  const props: Props = $props();
  createGeomLayer("path", () => props, ["alpha", "linewidth", "curve"]);
</script>
