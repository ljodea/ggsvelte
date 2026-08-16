/**
 * Band-axis planner registry.
 *
 * Continuous-x/y charts never call the planner. Register it only when a
 * categorical axis needs measured wrap/rotate/thin layout.
 */
import type { BandAxisPlan, BandAxisPlanInput } from "./band-guide-types.js";

export type BandAxisPlanner = (input: BandAxisPlanInput) => BandAxisPlan;

let planner: BandAxisPlanner | undefined;

export function registerBandAxisPlanner(plan: BandAxisPlanner): void {
  planner = plan;
}

export function getBandAxisPlanner(): BandAxisPlanner | undefined {
  return planner;
}
