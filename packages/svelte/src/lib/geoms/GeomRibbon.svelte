<script lang="ts">
  /**
   * <GeomRibbon> — declaration-only ribbon-layer sugar for <GGPlot>
   * (filled interval between precomputed lower/upper bounds).
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { AesInput, RibbonParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends RibbonParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
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
