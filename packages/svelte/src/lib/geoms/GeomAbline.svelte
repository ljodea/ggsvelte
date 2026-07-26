<script lang="ts">
  /**
   * <GeomAbline> — declaration-only slope/intercept reference line for <GGPlot>.
   * Annotation form: set slope (default 1) and intercept (default 0).
   * The line is clipped to the panel; does not inherit plot aes.
   */
  import type { DataInput, AesInput, AblineParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends AblineParams {
    /** Optional layer-local data; ignored for annotation abline (v1). */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (constants only for styles in v1). */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("abline", () => props, ["slope", "intercept", "alpha", "linewidth"]);
</script>
