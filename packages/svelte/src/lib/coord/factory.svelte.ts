/**
 * Factory for declaration-only coord components (#659 slice 5).
 *
 * Every <Coord*> shell is a thin wrapper: it passes a build callback that
 * reads the live `$props()` proxy through {@link definedProps}, and this
 * factory registers a `kind: "coord"` plot layer whose value getter defers
 * that read — so prop updates flow into the plot's derived spec without
 * re-registration (ADR 0001).
 *
 * Open option bags (no role whitelist): undefined-valued own keys are
 * stripped so ExactOptionalPropertyTypes + additionalProperties:false agree,
 * but unknown/misspelled props reach validate() and fail loudly.
 */
import type { CoordSpec } from "@ggsvelte/spec";

import { registerPlotLayer } from "../geoms/registry.svelte.js";

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Same contract as the scale factory's {@link definedProps}.
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
 * Register a coord plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass.
 */
export function createCoordLayer(build: () => CoordSpec | "flip"): void {
  registerPlotLayer({
    kind: "coord",
    get value() {
      return build();
    },
  });
}
