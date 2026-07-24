<script lang="ts">
  /**
   * Mark layer child with live layer-local data (for #609 epoch tests).
   * Uses registerLayer so the descriptor's data getter tracks $props.data.
   */
  import { registerLayer } from "../../src/lib/index.js";

  const {
    data,
  }: {
    data: readonly Record<string, unknown>[];
  } = $props();

  registerLayer({
    geom: "point",
    get data() {
      return data;
    },
    get params() {
      return { size: 3 };
    },
  });
</script>
