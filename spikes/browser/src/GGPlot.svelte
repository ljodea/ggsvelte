<script lang="ts">
  import type { Snippet } from "svelte";
  import { provideRegistry, type LayerRegistry } from "./registry.svelte.js";

  let {
    title = "plot",
    children,
    onRegistryCreated,
  }: {
    title?: string;
    children?: Snippet;
    /** Test hook: exposes the internal registry for hostile assertions. */
    onRegistryCreated?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  onRegistryCreated?.(registry);

  // Scene assembly goes through $derived on purpose — this mirrors the product's
  // "spec assembly is $derived" design and is the thing the ordering hazard is about.
  // $derived is lazy: it is first evaluated when the template below reads it, which
  // is AFTER {@render children?.()} has run (template order), so all init-time
  // registrations are already present on first evaluation.
  const scene = $derived(
    registry.layers.map((e) => ({
      id: e.id,
      geom: e.descriptor.geom,
      label: e.descriptor.label ?? "",
      alpha: e.descriptor.alpha,
      linewidth: e.descriptor.linewidth,
    })),
  );
</script>

<!-- Children FIRST: they emit no markup, they only register. Template order is
     load-bearing — see GGPlotSceneFirst.svelte for the demonstrated failure mode. -->
{@render children?.()}

<figure data-plot={title}>
  <ul data-scene>
    {#each scene as layer (layer.id)}
      <li data-layer>
        {layer.geom}:{layer.label}:{layer.alpha ?? ""}:{layer.linewidth ?? ""}
      </li>
    {/each}
  </ul>
  <figcaption data-layer-count>{scene.length}</figcaption>
</figure>
