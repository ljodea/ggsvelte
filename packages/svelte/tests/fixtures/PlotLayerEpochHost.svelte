<script lang="ts">
  /**
   * Registry host with a mark (layer-local data) + theme plot layer for the
   * #609 epoch regression. Exposes the registry so tests can read markLayers.
   */
  import { untrack } from "svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import {
    provideRegistry,
    type LayerRegistry,
  } from "../../src/lib/geoms/registry.svelte.js";
  import PlotLayerChild from "./PlotLayerChild.svelte";
  import PlotLayerMarkWithData from "./PlotLayerMarkWithData.svelte";

  const {
    markData,
    theme = "dark",
    capture,
  }: {
    markData: readonly Record<string, unknown>[];
    theme?: ThemeName;
    capture?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  untrack(() => capture?.(registry));
</script>

<PlotLayerMarkWithData data={markData} />
<PlotLayerChild kind="theme" value={theme} />
