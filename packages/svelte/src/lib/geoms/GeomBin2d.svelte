<script lang="ts">
  /**
   * <GeomBin2d> — 2D rectangular bin heatmap (ggplot2 geom_bin2d).
   * Requires continuous x and y; fill defaults to after_stat count.
   */
  import type { DataInput, AesInput, Bin2dParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends Bin2dParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("bin_2d", () => props, [
    "bins",
    "binwidth",
    "drop",
    "alpha",
    "linewidth",
  ]);
</script>
