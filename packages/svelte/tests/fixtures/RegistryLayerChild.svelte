<script lang="ts">
  /**
   * Child harness that registerLayer's a descriptor during component init
   * (and unregisters on destroy via the registry contract).
   */
  import {
    registerLayer,
    type LayerDescriptor,
  } from "../../src/lib/geoms/registry.svelte.js";

  const {
    descriptor,
  }: {
    descriptor: LayerDescriptor;
  } = $props();

  registerLayer(descriptor);
</script>
