/**
 * Behavior tests for cross-module transition apply (#627).
 * Expected values are independent of the production apply helper shape.
 */
import { describe, expect, it, vi } from "vitest";

import { applyInspectionDismissSideEffects } from "../../src/lib/interaction/transition-owner.js";
import { planInspectionDismiss } from "../../src/lib/inspection/teardown.js";

describe("applyInspectionDismissSideEffects", () => {
  it("escape with returnToInspect clears brush and chooses inspect", () => {
    const plan = planInspectionDismiss({
      kind: "escape",
      hasInspection: true,
      returnToInspect: true,
    });
    const clearBrush = vi.fn();
    const chooseTool = vi.fn();

    applyInspectionDismissSideEffects(plan, { clearBrush, chooseTool });

    expect(clearBrush).toHaveBeenCalledTimes(1);
    expect(chooseTool).toHaveBeenCalledWith("inspect");
  });

  it("close plan does not clear brush or choose tool", () => {
    const plan = planInspectionDismiss({
      kind: "close",
      hasInspection: true,
      restoreFocus: true,
    });
    const clearBrush = vi.fn();
    const chooseTool = vi.fn();

    applyInspectionDismissSideEffects(plan, { clearBrush, chooseTool });

    expect(clearBrush).not.toHaveBeenCalled();
    expect(chooseTool).not.toHaveBeenCalled();
  });

  it("escape without returnToInspect still clears brush only", () => {
    const plan = planInspectionDismiss({
      kind: "escape",
      hasInspection: true,
      returnToInspect: false,
    });
    const clearBrush = vi.fn();
    const chooseTool = vi.fn();

    applyInspectionDismissSideEffects(plan, { clearBrush, chooseTool });

    expect(clearBrush).toHaveBeenCalledTimes(1);
    expect(chooseTool).not.toHaveBeenCalled();
  });
});
