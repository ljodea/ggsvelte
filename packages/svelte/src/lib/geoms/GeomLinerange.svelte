<script lang="ts">
  /**
   * <GeomLinerange> — vertical stem from ymin to ymax without end caps (#793).
   */
  import type { DataInput, AesInput, LinerangeParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends LinerangeParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
    stat?: "identity" | "summary";
  }

  const props: Props = $props();
  createGeomLayer("linerange", () => props, [
    "width",
    "linewidth",
    "alpha",
    "fun",
    "funMin",
    "funMax",
  ]);
</script>
