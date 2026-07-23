/**
 * Cross-module interaction transition apply (issue #627).
 *
 * Pure decision tables live in inspection/teardown, surface/brush-finish, etc.
 * This module owns only multi-module *side-effect application* after a plan is
 * decided — not a method-forwarding port over sibling controllers.
 */
import type { InteractionTool } from "./interaction.js";
import type { InspectionDismissPlan } from "../inspection/teardown.js";

/** Surface ops required when applying an inspection dismiss plan across modules. */
export type DismissSurfaceSink = {
  clearBrush(): void;
  chooseTool(next: InteractionTool): void;
};

/**
 * Apply the cross-module tail of `planInspectionDismiss`.
 * Local inspection clears stay in InspectionState; brush/tool live on surface.
 */
export function applyInspectionDismissSideEffects(
  plan: InspectionDismissPlan,
  surface: DismissSurfaceSink,
): void {
  if (plan.clearBrush) surface.clearBrush();
  if (plan.returnToInspect) surface.chooseTool("inspect");
}
