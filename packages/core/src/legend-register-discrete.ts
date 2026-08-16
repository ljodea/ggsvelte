import { buildDiscrete } from "./legend-build-discrete.js";
import { registerDiscreteLegendBuilder } from "./legend-build-registry.js";

let registered = false;

/** Register the categorical legend scene builder. Idempotent. */
export function registerDiscreteLegend(): void {
  if (registered) return;
  registered = true;
  registerDiscreteLegendBuilder(buildDiscrete);
}
