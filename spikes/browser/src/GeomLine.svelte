<script lang="ts">
  import { registerLayer } from "./registry.svelte.js";

  let {
    label = "line",
    linewidth = 1,
  }: { label?: string; linewidth?: number } = $props();

  registerLayer({
    geom: "line",
    get label() {
      return label;
    },
    get linewidth() {
      return linewidth;
    },
  });
</script>

<!-- Declaration-only: this component intentionally emits NO markup. -->
