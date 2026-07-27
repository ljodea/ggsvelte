<script lang="ts">
  /**
   * <GeomPointrange> — stem + mid point at (x, y) (#793).
   */
  import type { DataInput, AesInput, PointrangeParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends PointrangeParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
    stat?: "identity" | "summary";
  }

  const props: Props = $props();
  createGeomLayer("pointrange", () => props, [
    "linewidth",
    "alpha",
    "size",
    "shape",
    "fun",
    "funMin",
    "funMax",
  ]);
</script>
