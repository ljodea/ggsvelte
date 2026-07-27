<script lang="ts">
  /**
   * <GeomSfLabel> — SF labels with background boxes for <GGPlot>
   * (portable GeoJSON Geometry → representative point + boxed label; #809 phase 3).
   */
  import type { DataInput, AesInput, SfLabelParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SfLabelParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("sf_label", () => props, [
    "geometry",
    "alpha",
    "size",
    "anchor",
    "dx",
    "dy",
    "padding",
    "radius",
    "linewidth",
  ]);
</script>
