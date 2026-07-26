<script lang="ts">
  /**
   * <GeomHline> — declaration-only horizontal reference-line sugar for <GGPlot>
   * (ggplot2 geom_hline; canonicalized to rule). Annotation form: set
   * yintercept. Data-driven form: map aes.y. Same contract and z-order
   * constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, HlineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends HlineParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("hline", () => props, ["yintercept", "alpha", "linewidth"]);
</script>
