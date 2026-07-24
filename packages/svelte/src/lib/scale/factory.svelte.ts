/**
 * Factory for declaration-only scale components (#659 slice 3).
 *
 * Every <Scale*> shell is a thin wrapper: it passes a build callback that
 * reads the live `$props()` proxy through {@link definedProps}, and this
 * factory registers a `kind: "scale"` plot layer whose value getter defers
 * that read — so prop updates flow into the plot's derived spec without
 * re-registration (ADR 0001).
 *
 * Unlike the theme factory, we do NOT whitelist keys (D4): undefined-valued
 * own keys are stripped so ExactOptionalPropertyTypes +
 * additionalProperties:false agree, but unknown/misspelled props reach
 * validate() and fail loudly.
 */
import type { Scales } from "@ggsvelte/spec";

import { registerPlotLayer } from "../geoms/registry.svelte.js";

/**
 * Copy own enumerable keys whose value is not `undefined`. No whitelist.
 * Preserves the helper contract: `scaleColorDiscrete({})` and
 * `scheme={undefined}` produce the same fragment.
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
 * Register a scale plot layer from a deferred builder. The getter is
 * load-bearing: it re-reads props on every assemble pass.
 */
export function createScaleLayer(build: () => Scales): void {
  registerPlotLayer({
    kind: "scale",
    get value() {
      return build();
    },
  });
}
