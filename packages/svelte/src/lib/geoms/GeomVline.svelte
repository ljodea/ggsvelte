<script lang="ts">
  /**
   * <GeomVline> — declaration-only vertical reference-line sugar for <GGPlot>
   * (ggplot2 geom_vline; canonicalized to rule). Annotation form: set
   * xintercept. Data-driven form: map aes.x. Same contract and z-order
   * constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, VlineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends VlineParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("vline", () => props, ["xintercept", "alpha", "linewidth"]);
</script>
