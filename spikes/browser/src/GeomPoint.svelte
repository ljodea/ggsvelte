<script lang="ts">
  import { registerLayer } from "./registry.svelte.js";

  let { label = "point", alpha = 1 }: { label?: string; alpha?: number } =
    $props();

  // Registration happens synchronously during component init, in template order.
  // The getters keep the registered descriptor live: prop updates flow through
  // without re-registering.
  registerLayer({
    geom: "point",
    get label() {
      return label;
    },
    get alpha() {
      return alpha;
    },
  });
</script>

<!-- Declaration-only: this component intentionally emits NO markup. -->
