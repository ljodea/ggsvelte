<script lang="ts">
  /**
   * <GeomSegment> — declaration-only finite segment sugar for <GGPlot>
   * (one line per row from (x,y) to (xend,yend)). Distinct from <GeomRule>
   * which spans the panel. Same contract and z-order constraint as
   * <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, SegmentParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SegmentParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** "identity" (default) or "unique" (first-wins aesthetic dedupe; #813). */
    stat?: "identity" | "unique";
  }

  const props: Props = $props();
  createGeomLayer("segment", () => props, ["alpha", "linewidth", "lineend"]);
</script>
