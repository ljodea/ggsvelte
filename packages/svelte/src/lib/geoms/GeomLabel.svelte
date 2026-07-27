<script lang="ts">
  /**
   * <GeomLabel> — declaration-only text-with-box sugar for <GGPlot> (requires x,
   * y, and label channels; no collision detection). ggplot2 geom_label.
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type {
    DataInput,
    AesInput,
    PositionParams,
    LabelParams,
  } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends LabelParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "identity" (default) | "nudge" (positionParams.x/y). */
    position?: "identity" | "nudge";
    /** Nudge offsets (data units / band-step fractions). */
    positionParams?: PositionParams;
  }

  const props: Props = $props();
  createGeomLayer("label", () => props, [
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
