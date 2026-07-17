<script lang="ts">
  /**
   * Stable registry host wrapping FactoryProbe so createGeomLayer registers
   * under provideRegistry and live prop updates share one registry instance.
   */
  import type { GeomName } from "@ggsvelte/spec";

  import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
  import { provideRegistry } from "../../src/lib/geoms/registry.svelte.js";
  import FactoryProbe from "./FactoryProbe.svelte";

  const {
    capture,
    geom,
    paramKeys,
    layerRender,
    ...rest
  }: {
    capture?: (registry: LayerRegistry) => void;
    geom: GeomName;
    paramKeys: readonly string[];
    /** Maps to GeomProps.render (backend hint). */
    layerRender?: "svg" | "canvas" | "auto";
    [key: string]: unknown;
  } = $props();

  const registry = provideRegistry();
  capture?.(registry);
</script>

<FactoryProbe {geom} {paramKeys} render={layerRender} {...rest} />
