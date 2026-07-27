<script lang="ts">
  /**
   * Registry-only host for geom-child parity tests (#1039).
   * Provides LayerRegistry so <Geom*> shells register without mounting
   * <GGPlot> / running the pipeline (sf/map/qq/function reject generic rows).
   */
  import { untrack, type Component } from "svelte";

  import {
    provideRegistry,
    type LayerRegistry,
  } from "../../src/lib/geoms/registry.svelte.js";

  const {
    Shell,
    shellProps = {},
    captureRegistry,
  }: {
    // Shell prop bags vary per geom; Component<any> matches ScaleRegistryHost.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Shell: Component<any>;
    shellProps?: Record<string, unknown>;
    captureRegistry?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  untrack(() => captureRegistry?.(registry));
</script>

<Shell {...shellProps} />
