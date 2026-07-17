<script lang="ts">
  /**
   * Child harness that registerLayer's a descriptor during component init
   * (and unregisters on destroy via the registry contract).
   */
  import {
    registerLayer,
    type LayerDescriptor,
  } from "../../src/lib/geoms/registry.svelte.js";
  import { untrack } from "svelte";

  const {
    descriptor,
  }: {
    descriptor: LayerDescriptor;
  } = $props();

  // Registration is deliberately init-time; the descriptor itself supplies
  // live getters when callers need reactive values.
  registerLayer(untrack(() => descriptor));
</script>
