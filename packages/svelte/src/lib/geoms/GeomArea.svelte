<script lang="ts">
  /**
   * <GeomArea> — declaration-only area-layer sugar for <GGPlot> (filled
   * region from the zero baseline; default position "stack").
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type {
    DataInput,
    AesInput,
    AreaParams,
    StackablePosition,
  } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends AreaParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /**
     * identity (default) | unique (#813) |
     * align (shared continuous-x grid for stack/fill; #815).
     */
    stat?: "identity" | "unique" | "align";
    /** Position adjustment: "stack" (default) | "fill" | "identity". */
    position?: StackablePosition;
  }

  const props: Props = $props();
  createGeomLayer("area", () => props, ["alpha"]);
</script>
