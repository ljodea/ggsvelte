<script lang="ts">
  /**
   * <GeomSfText> — declaration-only SF text labels for <GGPlot>
   * (portable GeoJSON Geometry → representative point + label; #809 phase 2).
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, SfTextParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends SfTextParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("sf_text", () => props, [
    "geometry",
    "alpha",
    "size",
    "anchor",
    "dx",
    "dy",
  ]);
</script>
