<script lang="ts">
  /**
   * <GeomCount> — overplotting counts at unique (x, y); size → after_stat n
   * (ggplot2 geom_count). Same z-order contract as <GeomPoint> (decision 0001).
   */
  import type {
    AesInput,
    DataInput,
    PointParams,
    PointPosition,
    PositionParams,
    RenderBackend,
  } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends PointParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
    position?: PointPosition;
    positionParams?: PositionParams;
    render?: RenderBackend;
  }

  const props: Props = $props();
  createGeomLayer("count", () => props, ["alpha", "size", "shape"]);
</script>
