/**
 * Pure unit tests for inspection/teardown.ts decision tables:
 * planSceneInspectReconcile and planInspectionDismiss.
 */
import { describe, expect, it } from "vitest";

import {
  planInspectionDismiss,
  planSceneInspectReconcile,
} from "../../src/lib/inspection/teardown.js";
describe("planSceneInspectReconcile", () => {
  it("clears when inspect is disabled only if inspection is live", () => {
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: false,
        getInspectionState: () => "none",
        modelRunId: 1,
        reconciledRun: 0,
      }),
    ).toEqual({ type: "noop" });
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: false,
        getInspectionState: () => "pinned",
        modelRunId: 1,
        reconciledRun: 0,
      }),
    ).toEqual({ type: "clear-disabled" });
  });

  it("skips when model is missing or run is already reconciled without reading inspection", () => {
    let reads = 0;
    const getInspectionState = (): "none" | "transient" | "pinned" => {
      reads += 1;
      return "transient";
    };
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: true,
        getInspectionState,
        modelRunId: null,
        reconciledRun: 0,
      }),
    ).toEqual({ type: "skip" });
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: true,
        getInspectionState,
        modelRunId: 3,
        reconciledRun: 3,
      }),
    ).toEqual({ type: "skip" });
    expect(reads).toBe(0);
  });

  it("routes advanced runs by inspection state (enabled-off already handled)", () => {
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: true,
        getInspectionState: () => "transient",
        modelRunId: 2,
        reconciledRun: 1,
      }),
    ).toEqual({ type: "invalidate-clear-transient" });
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: true,
        getInspectionState: () => "pinned",
        modelRunId: 2,
        reconciledRun: 1,
      }),
    ).toEqual({ type: "invalidate-reconcile-pinned" });
    expect(
      planSceneInspectReconcile({
        inspectionEnabled: true,
        getInspectionState: () => "none",
        modelRunId: 2,
        reconciledRun: 1,
      }),
    ).toEqual({ type: "invalidate-idle" });
  });
});

describe("planInspectionDismiss", () => {
  it("plans escape with invalidate, brush clear, pending discard, and optional returnToInspect", () => {
    // #856: Escape ends the pin session — discard pending pin stash so a
    // later re-pin cannot restore a pre-Escape candidate.
    expect(
      planInspectionDismiss({
        kind: "escape",
        hasInspection: true,
        returnToInspect: true,
      }),
    ).toEqual({
      emitClear: true,
      clearPendingPinned: true,
      coordinator: "invalidate",
      clearBrush: true,
      clearTooltipHovered: true,
      restoreFocus: false,
      returnToInspect: true,
    });
    expect(
      planInspectionDismiss({
        kind: "escape",
        hasInspection: false,
        returnToInspect: false,
      }),
    ).toEqual({
      emitClear: false,
      clearPendingPinned: true,
      coordinator: "invalidate",
      clearBrush: true,
      clearTooltipHovered: true,
      restoreFocus: false,
      returnToInspect: false,
    });
  });

  it("plans close with release-pinned, pending clear, and restoreFocus default true", () => {
    expect(
      planInspectionDismiss({
        kind: "close",
        hasInspection: true,
      }),
    ).toEqual({
      emitClear: true,
      clearPendingPinned: true,
      coordinator: "release-pinned",
      clearBrush: false,
      clearTooltipHovered: true,
      restoreFocus: true,
      returnToInspect: false,
    });
    expect(
      planInspectionDismiss({
        kind: "close",
        hasInspection: false,
        restoreFocus: false,
      }),
    ).toEqual({
      emitClear: false,
      clearPendingPinned: true,
      coordinator: "release-pinned",
      clearBrush: false,
      clearTooltipHovered: true,
      restoreFocus: false,
      returnToInspect: false,
    });
  });
});
