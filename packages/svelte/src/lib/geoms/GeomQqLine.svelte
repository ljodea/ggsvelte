<script lang="ts">
  /**
   * <GeomQqLine> — Q–Q reference line (ggplot2 geom_qq_line). Requires aes.sample.
   */
  import type { DataInput, AesInput, QqLineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends QqLineParams {
    data?: DataInput | readonly Record<string, unknown>[];
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("qq_line", () => props, ["alpha", "linewidth"]);
</script>
