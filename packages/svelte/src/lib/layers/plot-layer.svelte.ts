/**
 * Shared factory for declaration-only non-mark plot layers (#786).
 *
 * Six grammar families (scale, coord, facet, labs, guides, legend) previously
 * each shipped an identical `definedProps` + `create*Layer` pair. One module
 * owns the ADR 0001 contract: register during component init with a live
 * `value` getter over the child's `$props`, unregister in `onDestroy`.
 *
 * Theme stays in `theme/factory.svelte.ts` (role whitelist + ThemeName|ThemeSpec
 * shape). Marks stay in `geoms/factory.svelte.ts` (paramKeys whitelist).
 * Guides' `splitChannel` stays in `guides/factory.svelte.ts` (real behaviour).
 */
import type { Layer } from "../geoms/registry.svelte.js";
import { registerPlotLayer } from "../geoms/registry.svelte.js";

/** Non-mark layer kinds that register a live `value` getter. */
type ValueLayer = Exclude<Layer, { kind: "mark" }>;
export type PlotLayerKind = ValueLayer["kind"];

/**
 * Value type for a given plot-layer kind. Indexed access on a `get value()`
 * declaration yields the getter's return type.
 */
export type LayerValue<K extends PlotLayerKind> = Extract<ValueLayer, { kind: K }>["value"];

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Undefined-valued own keys are stripped so exactOptionalPropertyTypes +
 * additionalProperties:false agree, but unknown/misspelled props reach
 * validate() and fail loudly.
 */
export function definedProps<T extends object>(props: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    const value = (props as Record<string, unknown>)[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * Register a non-mark plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass (ADR 0001).
 *
 * The cast is unavoidable — TypeScript cannot correlate a generic `K` with
 * the matching `Layer` union member. Kind→value mapping is enforced by
 * `plot-layer-contract.ts` (compile-time only).
 */
export function createPlotLayer<K extends PlotLayerKind>(
  kind: K,
  build: () => LayerValue<K>,
): void {
  const layer = {
    kind,
    get value(): LayerValue<K> {
      return build();
    },
  };
  registerPlotLayer(layer as unknown as Layer);
}
