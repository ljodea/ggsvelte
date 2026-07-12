<script lang="ts">
  /**
   * <GeomHistogram> — declaration-only histogram sugar for <GGPlot>
   * (canonicalized to bar + stat bin: map a continuous aes.x, never aes.y;
   * default bins = 30 with an advisory — set binwidth or bins). Same
   * contract and z-order constraint as <GeomPoint> (decision 0001).
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
  createGeomLayer("histogram", () => props, [
    "alpha",
    "width",
    "bins",
    "binwidth",
    "boundary",
    "center",
    "closed",
  ]);
</script>
