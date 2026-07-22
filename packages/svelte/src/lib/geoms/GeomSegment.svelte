<script lang="ts">
  /**
   * <GeomSegment> — declaration-only finite segment sugar for <GGPlot>
   * (one line per row from (x,y) to (xend,yend)). Distinct from <GeomRule>
   * which spans the panel. Same contract and z-order constraint as
   * <GeomPoint> (decision 0001).
   */
  import type { AesInput, SegmentParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SegmentParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("segment", () => props, ["alpha", "linewidth", "lineend"]);
</script>
