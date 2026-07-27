<script lang="ts">
  /**
   * <GeomViolin> — declaration-only violin sugar for <GGPlot>
   * (mirrored y-density polygons per discrete x). Same contract and
   * z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, ViolinParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends ViolinParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "dodge" (default) | "identity". */
    position?: "dodge" | "identity";
  }

  const props: Props = $props();
  createGeomLayer("violin", () => props, [
    "bw",
    "adjust",
    "n",
    "trim",
    "scale",
    "width",
    "alpha",
    "linewidth",
    "fillPaint",
    "strokePaint",
    "glow",
  ]);
</script>
