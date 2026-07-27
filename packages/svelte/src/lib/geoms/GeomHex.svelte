<script lang="ts">
  /**
   * <GeomHex> — hexagonal 2D bin heatmap (ggplot2 geom_hex).
   * Requires continuous x and y; fill defaults to after_stat count.
   */
  import type { DataInput, AesInput, HexParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends HexParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("hex", () => props, ["bins", "drop", "alpha", "linewidth"]);
</script>
