<script lang="ts">
  /**
   * <GeomJitter> — declaration-only jittered-point sugar for <GGPlot>
   * (ggplot2 geom_jitter; canonicalized to point + position jitter). Flat
   * width/height/seed props assemble into positionParams. Same contract and
   * z-order constraint as <GeomPoint> (decision 0001).
   */
  import type {
    AesInput,
    DataInput,
    PointParams,
    PositionParams,
    RenderBackend,
  } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends PointParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** Maximum horizontal jitter (data units / band-step fraction). */
    width?: number;
    /** Maximum vertical jitter (data units / band-step fraction). */
    height?: number;
    /** Seeded RNG seed (ggsvelte jitter is always seeded; default 42). */
    seed?: number;
    /** Explicit positionParams; flat width/height/seed override matching keys. */
    positionParams?: PositionParams;
    /** Rendering backend hint ("svg" | "canvas" | "auto"). */
    render?: RenderBackend;
  }

  const props: Props = $props();
  createGeomLayer(
    "jitter",
    () => {
      const { width, height, seed, positionParams, ...rest } = props;
      const merged = {
        ...positionParams,
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(seed !== undefined && { seed }),
      };
      return {
        ...rest,
        ...(Object.keys(merged).length > 0 && { positionParams: merged }),
      };
    },
    ["alpha", "size", "shape"],
  );
</script>
