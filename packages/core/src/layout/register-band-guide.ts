import { planBandAxis } from "./band-guide.js";
import { registerBandAxisPlanner } from "./band-guide-registry.js";

let registered = false;

/** Register the measured categorical axis planner. Idempotent. */
export function registerBandGuide(): void {
  if (registered) return;
  registered = true;
  registerBandAxisPlanner(planBandAxis);
}
