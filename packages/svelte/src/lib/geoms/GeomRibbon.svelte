<script lang="ts">
  /**
   * <GeomRibbon> — declaration-only ribbon-layer sugar for <GGPlot>
   * (filled interval between precomputed lower/upper bounds).
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, RibbonParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends RibbonParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** "identity" (default) or "unique" (first-wins aesthetic dedupe; #813). */
    stat?: "identity" | "unique";
  }

  const props: Props = $props();
  createGeomLayer("ribbon", () => props, [
    "alpha",
    "linewidth",
    "outline",
    "orientation",
    "lineend",
    "linejoin",
  ]);
</script>
