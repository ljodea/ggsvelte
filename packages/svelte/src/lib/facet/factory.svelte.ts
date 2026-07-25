/**
 * Factory for declaration-only facet components (#659 slice 5).
 *
 * Every <Facet*> shell is a thin wrapper: it passes a build callback that
 * reads the live `$props()` proxy through {@link definedProps}, and this
 * factory registers a `kind: "facet"` plot layer whose value getter defers
 * that read — so prop updates flow into the plot's derived spec without
 * re-registration (ADR 0001).
 *
 * Open option bags (no role whitelist): undefined-valued own keys are
 * stripped so ExactOptionalPropertyTypes + additionalProperties:false agree.
 * Bare `<Facet/>` with no wrap/rows/cols still registers an empty facet and
 * fails loudly at validate (`facet-form-missing`).
 */
import type { FacetInput } from "@ggsvelte/spec";

import { registerPlotLayer } from "../geoms/registry.svelte.js";

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Same contract as the scale factory's definedProps.
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
 * Register a facet plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass.
 */
export function createFacetLayer(build: () => FacetInput): void {
  registerPlotLayer({
    kind: "facet",
    get value() {
      return build();
    },
  });
}
