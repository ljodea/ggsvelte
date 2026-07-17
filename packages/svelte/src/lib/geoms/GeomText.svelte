<script lang="ts">
  /**
   * <GeomText> — declaration-only text-label sugar for <GGPlot> (requires x,
   * y, and label channels; no collision detection).
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { AesInput, PositionParams, TextParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends TextParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "identity" (default) | "nudge" (positionParams.x/y). */
    position?: "identity" | "nudge";
    /** Nudge offsets (data units / band-step fractions). */
    positionParams?: PositionParams;
  }

  const props: Props = $props();
  createGeomLayer("text", () => props, ["alpha", "size", "anchor", "dx", "dy"]);
</script>
