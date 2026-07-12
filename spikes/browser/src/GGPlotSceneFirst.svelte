<script lang="ts">
  import type { Snippet } from "svelte";
  import { provideRegistry, type LayerRegistry } from "./registry.svelte.js";

  let {
    children,
    onRegistryCreated,
  }: {
    children?: Snippet;
    onRegistryCreated?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  onRegistryCreated?.(registry);
</script>

<!-- HAZARD DEMONSTRATION: scene markup placed BEFORE the children render tag.
     On SSR the scene is emitted before any child has registered → permanently empty.
     On CSR the each block is created first (empty), children register afterwards,
     and the scene only fills in on the next flush → deferred first paint.
     This is the ordering failure mode; GGPlot.svelte avoids it by template order. -->
<figure data-plot="scene-first">
  <ul data-scene>
    {#each registry.layers as entry (entry.id)}
      <li data-layer>{entry.descriptor.geom}:{entry.descriptor.label ?? ""}</li>
    {/each}
  </ul>
</figure>

{@render children?.()}
