<script lang="ts">
  import type { Snippet } from "svelte";
  import { provideRegistry, type LayerRegistry } from "../registry.svelte.js";

  let {
    title = "ordered",
    children,
    onRegistryCreated,
  }: {
    title?: string;
    children?: Snippet;
    onRegistryCreated?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  onRegistryCreated?.(registry);

  let host = $state<HTMLElement | undefined>();
  // Bumped whenever the children's DOM (marker order) changes. This is the only
  // signal that a pure keyed-{#each} MOVE happened: props don't change and the
  // registry membership doesn't change, so nothing else can trigger a re-sort.
  let domVersion = $state(0);

  $effect(() => {
    if (!host) return;
    const observer = new MutationObserver(() => {
      domVersion += 1;
    });
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  // Scene = registry entries sorted by MARKER DOM ORDER (= declaration order).
  // Entries whose marker is not yet connected keep registration order (stable sort).
  // No untrack(): DOM reads are non-reactive by nature; domVersion is the explicit
  // dependency that models them.
  const scene = $derived.by(() => {
    void domVersion;
    const entries = [...registry.layers];
    entries.sort((a, b) => {
      const na = a.descriptor.marker;
      const nb = b.descriptor.marker;
      if (!na || !nb || !na.isConnected || !nb.isConnected) return 0;
      return na.compareDocumentPosition(nb) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
    return entries.map((e) => ({
      id: e.id,
      geom: e.descriptor.geom,
      label: e.descriptor.label ?? "",
      alpha: e.descriptor.alpha,
    }));
  });
</script>

<div style="display:contents" bind:this={host}>
  {@render children?.()}
</div>

<figure data-plot={title}>
  <ul data-scene>
    {#each scene as layer (layer.id)}
      <li data-layer>{layer.geom}:{layer.label}:{layer.alpha ?? ""}</li>
    {/each}
  </ul>
  <figcaption data-layer-count>{scene.length}</figcaption>
</figure>
