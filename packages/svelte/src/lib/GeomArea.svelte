<script lang="ts">
  /**
   * <GeomArea> — declaration-only area-layer sugar for <GGPlot> (filled
   * region from the zero baseline; default position "stack").
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { AesInput, AreaParams, StackablePosition } from "@ggsvelte/spec";

  import { createGeomLayer } from "./geom-factory.svelte.js";

  interface Props extends AreaParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "stack" (default) | "fill" | "identity". */
    position?: StackablePosition;
  }

  const props: Props = $props();
  createGeomLayer("area", () => props, ["alpha"]);
</script>
