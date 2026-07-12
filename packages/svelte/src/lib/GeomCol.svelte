<script lang="ts">
  /**
   * <GeomCol> — declaration-only column-layer sugar for <GGPlot> (bars from
   * pre-computed heights; default position "stack").
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { AesInput, BarParams, StackablePosition } from "@ggsvelte/spec";

  import { createGeomLayer } from "./geom-factory.svelte.js";

  interface Props extends BarParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "stack" (default) | "fill" | "dodge" | "identity". */
    position?: StackablePosition;
  }

  const props: Props = $props();
  createGeomLayer("col", () => props, ["alpha", "width"]);
</script>
