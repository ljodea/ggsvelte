/**
 * Factory for the declaration-only labs component (#659 slice 6).
 *
 * Same contract as coord/facet/scale: the shell passes a build callback that
 * reads the live `$props()` proxy through {@link definedProps}, and this
 * factory registers a `kind: "labs"` plot layer whose value getter defers that
 * read — so prop updates flow into the plot's derived spec without
 * re-registration (ADR 0001).
 *
 * labs is a keyed-MERGE family (`builder.labs` shallow-merges), so a second
 * <Labs> child adds its keys rather than replacing the first.
 *
 * Open option bags (no role whitelist): undefined-valued own keys are stripped
 * so exactOptionalPropertyTypes + additionalProperties:false agree, but
 * unknown/misspelled props reach validate() and fail loudly.
 */
import type { Labs } from "@ggsvelte/spec";

import { registerPlotLayer } from "../geoms/registry.svelte.js";

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Same contract as the coord/facet/scale factories' definedProps.
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
 * Register a labs plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass.
 */
export function createLabsLayer(build: () => Labs): void {
  registerPlotLayer({
    kind: "labs",
    get value() {
      return build();
    },
  });
}
