import { buildRamp, buildSteps } from "./legend-build-continuous.js";
import { registerContinuousLegendBuilders } from "./legend-build-registry.js";

let registered = false;

/** Register the ramp and steps legend scene builders. Idempotent. */
export function registerContinuousLegend(): void {
  if (registered) return;
  registered = true;
  registerContinuousLegendBuilders({ ramp: buildRamp, steps: buildSteps });
}
