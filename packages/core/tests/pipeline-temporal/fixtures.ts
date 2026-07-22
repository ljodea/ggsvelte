/**
 * Shared helpers for temporal pipeline integration characterization.
 */
import type { AxisGuidePlan, GuidePlan } from "../../src/layout/temporal-guide.ts";

export const size = { width: 640, height: 400 };

export const yearRows = [
  { year: "1835", value: 1 },
  { year: "1900", value: 2 },
  { year: "2026", value: 3 },
];

export function axisGuideFor(plans: readonly GuidePlan[], aesthetic: "x" | "y"): AxisGuidePlan {
  const guide = plans.find(
    (plan): plan is AxisGuidePlan => plan.type === "axis" && plan.aesthetic === aesthetic,
  );
  if (guide === undefined) throw new Error(`Expected an axis guide for ${aesthetic}`);
  return guide;
}

export function axisGuidesFor(plans: readonly GuidePlan[], aesthetic: "x" | "y"): AxisGuidePlan[] {
  return plans.filter(
    (plan): plan is AxisGuidePlan => plan.type === "axis" && plan.aesthetic === aesthetic,
  );
}
