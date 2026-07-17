<script lang="ts">
  /**
   * <GeomDensity> — declaration-only kernel-density sugar for <GGPlot>
   * (stat density: gaussian KDE, bw.nrd0 bandwidth default; map a
   * continuous aes.x, never aes.y; map fill + alpha for overlays). Same
   * contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { AesInput, DensityParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends DensityParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("density", () => props, [
    "bw",
    "adjust",
    "n",
    "cut",
    "alpha",
  ]);
</script>
