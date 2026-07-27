<script lang="ts">
  /**
   * <GeomCrossbar> — interval box ymin–ymax with mid line at y (#793).
   */
  import type { DataInput, AesInput, CrossbarParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends CrossbarParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
    stat?: "identity" | "summary";
  }

  const props: Props = $props();
  createGeomLayer("crossbar", () => props, [
    "width",
    "fatten",
    "linewidth",
    "alpha",
    "fun",
    "funMin",
    "funMax",
  ]);
</script>
