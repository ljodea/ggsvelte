<script lang="ts">
  /**
   * <GeomBoxplot> — declaration-only boxplot sugar for <GGPlot>
   * (stat boxplot: type-7 quantile hinges, coef x IQR whiskers, outlier
   * points; requires discrete x + quantitative y; grouped boxes dodge by
   * default). Same contract and z-order constraint as <GeomPoint>
   * (decision 0001).
   */
  import type { AesInput, BoxplotParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./geom-factory.svelte.js";

  interface Props extends BoxplotParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "dodge" (default) | "identity". */
    position?: "dodge" | "identity";
  }

  const props: Props = $props();
  createGeomLayer("boxplot", () => props, [
    "width",
    "coef",
    "linewidth",
    "outlierSize",
    "alpha",
  ]);
</script>
