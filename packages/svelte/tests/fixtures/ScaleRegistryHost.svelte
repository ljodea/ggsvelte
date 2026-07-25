<script lang="ts">
  /**
   * Registry-only host for scale-child parity tests (#659 slice 4).
   * Provides LayerRegistry context so <Scale*> shells register, without
   * mounting <GGPlot> / running the render pipeline. Pipeline training is
   * orthogonal to shell→helper parity and rejects many scale+data combos
   * (temporal/binned/log with generic fixture rows).
   */
  import { untrack, type Component } from "svelte";

  import {
    provideRegistry,
    type LayerRegistry,
  } from "../../src/lib/geoms/registry.svelte.js";

  const {
    Shell,
    shellProps = {},
    ShellB,
    shellBProps = {},
    captureRegistry,
  }: {
    // Shell prop bags vary per helper; Component<any> matches ScaleShellHost.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Shell: Component<any>;
    shellProps?: Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ShellB?: Component<any>;
    shellBProps?: Record<string, unknown>;
    captureRegistry?: (registry: LayerRegistry) => void;
  } = $props();

  const registry = provideRegistry();
  untrack(() => captureRegistry?.(registry));
</script>

<Shell {...shellProps} />
{#if ShellB !== undefined}
  <ShellB {...shellBProps} />
{/if}
