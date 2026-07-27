<script lang="ts">
  /**
   * <GeomSpoke> — declaration-only spoke sugar for <GGPlot>
   * (ggplot2 geom_spoke: origin + angle radians + radius → segment).
   * Same z-order contract as <GeomPoint> (decision 0001).
   */
  import type { AesInput, DataInput, SpokeParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SpokeParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("spoke", () => props, [
    "angle",
    "radius",
    "alpha",
    "linewidth",
    "lineend",
  ]);
</script>
