<script lang="ts">
  /**
   * <GeomPoint> — declaration-only point-layer sugar for <GGPlot>
   * (decision 0001, mechanism A; built on the geom factory). Emits NO markup;
   * registers a live layer descriptor during component init and unregisters
   * on destroy. Inert without a <GGPlot> ancestor.
   *
   * CONSTRAINT (decision 0001): layer z-order equals registration order.
   * Static markup, `{#if}` membership, UNKEYED `{#each}`, and reactive prop
   * updates keep full declaration-order fidelity. Dynamic KEYED `{#each}`
   * reorder, mid-list insertion, and `{#if}` re-mount do NOT restore
   * declaration position (re-registration appends at the end) — use the
   * props-first API (`layers={[...]}`) for dynamic layer composition.
   */
  import type {
    AesInput,
    PointParams,
    PointPosition,
    PositionParams,
  } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends PointParams {
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Position adjustment: "identity" (default) | "jitter" (seeded) | "nudge". */
    position?: PointPosition;
    /** Jitter (width/height/seed) or nudge (x/y) parameters. */
    positionParams?: PositionParams;
  }

  const props: Props = $props();
  createGeomLayer("point", () => props, ["alpha", "size", "shape"]);
</script>
