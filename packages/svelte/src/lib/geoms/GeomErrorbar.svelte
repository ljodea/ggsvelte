<script lang="ts">
  /**
   * <GeomErrorbar> — declaration-only errorbar sugar for <GGPlot>. Identity
   * stat (default): map aes.ymin and aes.ymax. stat="summary": map aes.y —
   * bounds default to mean +/- standard error (ggplot2's mean_se; configure
   * with fun/funMin/funMax). Same contract and z-order constraint as
   * <GeomPoint> (decision 0001).
   */
  import type { AesInput, ErrorbarParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends ErrorbarParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** The layer's stat: "identity" (default, ymin/ymax mapped) | "summary". */
    stat?: "identity" | "summary";
  }

  const props: Props = $props();
  createGeomLayer("errorbar", () => props, [
    "width",
    "linewidth",
    "alpha",
    "fun",
    "funMin",
    "funMax",
  ]);
</script>
