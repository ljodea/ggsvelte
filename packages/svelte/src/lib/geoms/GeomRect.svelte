<script lang="ts">
  /**
   * <GeomRect> — declaration-only rect sugar for <GGPlot>. Map aes.xmin,
   * aes.xmax, aes.ymin, and aes.ymax to quantitative edge fields. Optional
   * color/linewidth/linetype draw outlines. Same z-order contract as other
   * geoms (decision 0001).
   */
  import type { AesInput, RectParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends RectParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("rect", () => props, ["alpha", "linewidth"]);
</script>
