<script lang="ts">
  /**
   * <GeomLine> — declaration-only line-layer sugar for <GGPlot>.
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { AesInput, LineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./geom-factory.svelte.js";

  interface Props extends LineParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("line", () => props, ["alpha", "linewidth", "curve"]);
</script>
