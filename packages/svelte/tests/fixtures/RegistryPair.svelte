<script lang="ts">
  /**
   * Parent/child harness for provideRegistry + registerLayer: host provides
   * context during init; each child component registers a descriptor (and
   * unregisters on destroy via onDestroy inside registerLayer).
   */
  import {
    provideRegistry,
    type LayerDescriptor,
    type LayerRegistry,
  } from "../../src/lib/geoms/registry.svelte.js";
  import { untrack } from "svelte";
  import RegistryLayerChild from "./RegistryLayerChild.svelte";

  const {
    descriptors = [],
    capture,
  }: {
    descriptors?: readonly LayerDescriptor[];
    capture?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  // The registry is intentionally exposed once during component init.
  untrack(() => capture?.(registry));
</script>

{#each descriptors as descriptor, i (i)}
  <RegistryLayerChild {descriptor} />
{/each}
