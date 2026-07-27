<script lang="ts">
  /**
   * <GeomCurve> — declaration-only curved-connector sugar for <GGPlot>
   * (ggplot2 geom_curve). Requires field-mapped x, y, xend, yend.
   * Same z-order contract as <GeomPoint> (decision 0001).
   */
  import type { AesInput, CurveParams, DataInput } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends CurveParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("curve", () => props, [
    "curvature",
    "angle",
    "ncp",
    "alpha",
    "linewidth",
    "lineend",
  ]);
</script>
