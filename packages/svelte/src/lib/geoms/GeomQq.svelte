<script lang="ts">
  /**
   * <GeomQq> — Q–Q scatter (ggplot2 geom_qq). Requires aes.sample.
   */
  import type { DataInput, AesInput, QqParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends QqParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("qq", () => props, ["alpha", "size", "shape"]);
</script>
