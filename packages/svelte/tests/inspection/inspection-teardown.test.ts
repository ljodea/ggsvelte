/**
 * Pure unit tests for inspection/teardown.ts decision tables.
 */
import { describe, expect, it } from "vitest";

import {
  planInspectionDismiss,
  planSceneInspectReconcile,
  resolveInspectionEmitAction,
  resolveSurfaceBlurAction,
  shouldClosePinnedOnOutsidePointer,
} from "../../src/lib/inspection/teardown.js";

describe("resolveSurfaceBlurAction", () => {
  it("ignores when relatedTarget is inside the plot root", () => {
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: true,
        inspectionState: "transient",
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: true,
        inspectionState: "pinned",
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: true,
        inspectionState: "none",
      }),
    ).toEqual({ type: "ignore" });
  });

  it("keeps pinned inspection when focus leaves the root", () => {
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: false,
        inspectionState: "pinned",
      }),
    ).toEqual({ type: "blur-keep-pinned" });
  });

  it("clears inspection for transient and none when focus leaves the root", () => {
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: false,
        inspectionState: "transient",
      }),
    ).toEqual({ type: "blur-clear-inspection" });
    expect(
      resolveSurfaceBlurAction({
        relatedTargetInsideRoot: false,
        inspectionState: "none",
      }),
    ).toEqual({ type: "blur-clear-inspection" });
  });
});

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

describe("shouldClosePinnedOnOutsidePointer", () => {
  it("closes only when pinned and target is outside the root", () => {
    expect(
      shouldClosePinnedOnOutsidePointer({
        inspectionState: "pinned",
        targetInsideRoot: false,
      }),
    ).toBe(true);
  });

  it("does not close for non-pinned inspection states", () => {
    for (const inspectionState of ["transient", "none", null, undefined] as const) {
      expect(
        shouldClosePinnedOnOutsidePointer({
          inspectionState,
          targetInsideRoot: false,
        }),
      ).toBe(false);
    }
  });

  it("does not close when target is inside the root", () => {
    expect(
      shouldClosePinnedOnOutsidePointer({
        inspectionState: "pinned",
        targetInsideRoot: true,
      }),
    ).toBe(false);
  });

  it("does not close when unpinned and inside", () => {
    expect(
      shouldClosePinnedOnOutsidePointer({
        inspectionState: "transient",
        targetInsideRoot: true,
      }),
    ).toBe(false);
  });
});

describe("resolveInspectionEmitAction", () => {
  it("on change with undefined semanticFingerprint emits without updating last", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: undefined,
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: null });
  });

  it("on clear builds clear:source fingerprint (ignores semanticFingerprint)", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "clear",
        source: "keyboard",
        semanticFingerprint: "sem:ignored",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: "clear:keyboard" });
  });

  it("skips when resolved fingerprint equals last, including empty string", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: "",
        lastFingerprint: "",
      }),
    ).toEqual({ type: "skip" });
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: "sem:a",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "skip" });
    expect(
      resolveInspectionEmitAction({
        phase: "clear",
        source: "touch",
        semanticFingerprint: undefined,
        lastFingerprint: "clear:touch",
      }),
    ).toEqual({ type: "skip" });
  });

  it("emits and updates when change fingerprint differs from last", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: "sem:b",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: "sem:b" });
  });

  it("characterizes a stateful sequence including clear tokens", () => {
    let last = "";
    const step = (
      phase: "clear" | "change",
      source: "pointer" | "keyboard" | "touch" | "programmatic",
      semanticFingerprint?: string,
    ) => {
      const action = resolveInspectionEmitAction({
        phase,
        source,
        semanticFingerprint,
        lastFingerprint: last,
      });
      if (action.type === "emit" && action.updateFingerprint !== null)
        last = action.updateFingerprint;
      return action;
    };

    // change with omitted semantic never mutates last
    expect(step("change", "pointer")).toEqual({ type: "emit", updateFingerprint: null });
    expect(last).toBe("");

    // empty semantic collides with initial last → skip
    expect(step("change", "pointer", "")).toEqual({ type: "skip" });
    expect(last).toBe("");

    // first real fingerprint updates
    expect(step("change", "pointer", "sem:1")).toEqual({
      type: "emit",
      updateFingerprint: "sem:1",
    });
    expect(last).toBe("sem:1");

    // equal suppresses
    expect(step("change", "pointer", "sem:1")).toEqual({ type: "skip" });
    expect(last).toBe("sem:1");

    // clear after semantic → emit clear:source and update
    expect(step("clear", "keyboard")).toEqual({
      type: "emit",
      updateFingerprint: "clear:keyboard",
    });
    expect(last).toBe("clear:keyboard");

    // same clear token suppresses
    expect(step("clear", "keyboard")).toEqual({ type: "skip" });
    expect(last).toBe("clear:keyboard");
  });
});

describe("planInspectionDismiss", () => {
  it("plans escape with invalidate, brush clear, and optional returnToInspect", () => {
    expect(
      planInspectionDismiss({
        kind: "escape",
        hasInspection: true,
        returnToInspect: true,
      }),
    ).toEqual({
      emitClear: true,
      clearPendingPinned: false,
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
      clearPendingPinned: false,
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
