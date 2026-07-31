/**
 * Host capability resolution — the one seam between the layer registry /
 * plot props and the engine for interaction capabilities (inspect from
 * `<Inspect>` children + prop, legendFocus / legendFilter from GuideLegend
 * layers + deprecated plot props).
 *
 * THREE independent deriveds — never one combined bag. The inspect resolve
 * reads only `registry.capabilities("inspect")` (`#capabilityVersion`), so
 * geom/mark layer churn must not re-run it: interactionConfig diagnostics
 * re-deliver per recompute (registry contract). The legend resolves read
 * `registry.layers` (`#version`).
 *
 * `interactionConfig` normalization stays in the engine — it must NOT read
 * `caps()` (legendFilter is not a normalizeInteractionConfig input; reading
 * it there re-delivered config diagnostics on every filter toggle).
 */
import type { LayerRegistry } from "../geoms/registry.svelte.js";
import {
  resolveLegendFilterCapability,
  type ResolvedLegendFilterCapability,
} from "../legend/resolve-legend-filter.js";
import {
  resolveLegendFocusCapability,
  type ResolvedLegendFocusCapability,
} from "../legend/resolve-legend-focus.js";
import {
  readLegacyPlotLegendFilter,
  readLegacyPlotLegendFocus,
  resolveCapabilities,
  type EnginePlotProps,
  type ResolvedPlotCapabilities,
} from "../plot-props.js";
import {
  resolveInspectCapability,
  type ResolveInspectCapabilityResult,
} from "./resolve-inspect-capability.js";

/**
 * SSR-safe derived: Svelte 5.33's one-pass SSR can cache a construction-time
 * empty registry before declaration children initialize. The server branch
 * recomputes on EVERY read (never caches); client reads keep normal rune
 * dependency tracking. Call during component init (or an effect root) only.
 */
export function ssrSafeDerived<T>(compute: () => T): () => T {
  const derived = $derived.by(compute);
  return () => (typeof window === "undefined" ? compute() : derived);
}

export type CapabilityResolution = {
  /** Inspect from prop + `<Inspect>` capability children (last child wins). */
  inspect(): ResolveInspectCapabilityResult;
  /** Legend focus from GuideLegend layers + deprecated plot prop. */
  legendFocus(): ResolvedLegendFocusCapability;
  /** Legend filter from GuideLegend layers + deprecated plot prop. */
  legendFilter(): ResolvedLegendFilterCapability;
  /** All five capability defaults for wiring advisories. */
  caps(): ResolvedPlotCapabilities;
};

export function createCapabilityResolution(host: {
  registry: LayerRegistry;
  props: EnginePlotProps;
}): CapabilityResolution {
  const inspect = ssrSafeDerived(() =>
    resolveInspectCapability({
      prop: host.props.inspect,
      children: host.registry.capabilities("inspect"),
    }),
  );
  const legendFocus = ssrSafeDerived(() =>
    resolveLegendFocusCapability({
      plotProp: readLegacyPlotLegendFocus(host.props),
      layers: host.registry.layers,
    }),
  );
  const legendFilter = ssrSafeDerived(() =>
    resolveLegendFilterCapability({
      plotProp: readLegacyPlotLegendFilter(host.props),
      layers: host.registry.layers,
    }),
  );
  const caps = (): ResolvedPlotCapabilities => {
    const select = host.props.select;
    const zoom = host.props.zoom;
    return resolveCapabilities({
      inspect: inspect().input,
      legendFocus: legendFocus().requested,
      legendFilter: legendFilter().requested,
      ...(select !== undefined && { select }),
      ...(zoom !== undefined && { zoom }),
    });
  };
  return { inspect, legendFocus, legendFilter, caps };
}
