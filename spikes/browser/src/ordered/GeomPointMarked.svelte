<script lang="ts">
  import { registerLayer } from "../registry.svelte.js";

  let { label = "point", alpha = 1 }: { label?: string; alpha?: number } =
    $props();

  let el = $state<HTMLElement | undefined>();

  registerLayer({
    geom: "point",
    get label() {
      return label;
    },
    get alpha() {
      return alpha;
    },
    get marker() {
      return el;
    },
  });
</script>

<!-- Mechanism B: ONE hidden, inert marker element so declaration order stays
     recoverable as DOM order. This is the price of keyed-reorder fidelity. -->
<gg-marker style="display:none" bind:this={el}></gg-marker>
