<script lang="ts">
  /**
   * <GeomBlank> — declaration-only empty-layer sugar for <GGPlot>
   * (ggplot2 geom_blank). Maps aesthetics for scale training without
   * drawing marks or hit targets. Same z-order registration contract as
   * <GeomPoint> (decision 0001).
   */
  import type { AesInput, DataInput, RenderBackend } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Rendering backend hint (ignored for paint — blank emits no marks). */
    render?: RenderBackend;
  }

  const props: Props = $props();
  createGeomLayer("blank", () => props, []);
</script>
