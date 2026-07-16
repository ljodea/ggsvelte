import { describe, expect, it } from "vitest";

import {
  buildInspectionCandidateRef,
  buildQueuedInspectFrame,
  buildQueuedPointerInspection,
  planInspectionDismiss,
  planSceneInspectReconcile,
  resolveInspectionCompleteness,
  resolveInspectionEmitAction,
  resolveInspectionMode,
  resolveQueuedInspectFrameAction,
  resolveSetInspectionAction,
  resolveSurfaceBlurAction,
  resolveToggleInspectionPinAction,
  shouldAnnounceUnpin,
  shouldClearInspectionAnnouncement,
  shouldClosePinnedOnOutsidePointer,
  shouldCommitInspection,
  shouldFocusPinnedInteractiveTooltip,
  type QueuedInspectFrameInput,
  type SetInspectionInput,
  type ToggleInspectionPinInput,
} from "../src/lib/plot-surface-inspection.js";

const frame = (overrides: Partial<QueuedInspectFrameInput> = {}): QueuedInspectFrameInput => ({
  hasPending: true,
  tokenAccepted: true,
  currentState: "none",
  candidateEpochMismatch: false,
  ...overrides,
});

describe("resolveQueuedInspectFrameAction", () => {
  it("returns none when there is no pending payload", () => {
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          hasPending: false,
          tokenAccepted: false,
          currentState: "pinned",
          candidateEpochMismatch: true,
        }),
      ),
    ).toEqual({ type: "none" });
  });

  it("drops stale frame tokens before pinned stash or epoch checks", () => {
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          tokenAccepted: false,
          currentState: "pinned",
          candidateEpochMismatch: false,
        }),
      ),
    ).toEqual({ type: "drop" });
  });

  it("stashes pending while inspection is pinned (before epoch mismatch)", () => {
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          currentState: "pinned",
          candidateEpochMismatch: true,
        }),
      ),
    ).toEqual({ type: "stash-pending" });
  });

  it("drops on candidate epoch mismatch for non-pinned host states", () => {
    for (const currentState of ["none", "transient"] as const) {
      expect(
        resolveQueuedInspectFrameAction(frame({ currentState, candidateEpochMismatch: true })),
      ).toEqual({ type: "drop" });
    }
  });

  it("applies pending for none/transient when token ok and epoch matches", () => {
    for (const currentState of ["none", "transient"] as const) {
      expect(resolveQueuedInspectFrameAction(frame({ currentState }))).toEqual({
        type: "apply-pending",
      });
    }
  });

  it("priority matrix: pending → token → stash → epoch → apply", () => {
    // no pending wins over everything
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          hasPending: false,
          tokenAccepted: true,
          currentState: "none",
          candidateEpochMismatch: false,
        }),
      ),
    ).toEqual({ type: "none" });

    // rejected token beats pinned stash
    expect(
      resolveQueuedInspectFrameAction(frame({ tokenAccepted: false, currentState: "pinned" })),
    ).toEqual({ type: "drop" });

    // pinned stash beats epoch drop
    expect(
      resolveQueuedInspectFrameAction(
        frame({ currentState: "pinned", candidateEpochMismatch: true }),
      ),
    ).toEqual({ type: "stash-pending" });

    // epoch drop beats apply
    expect(
      resolveQueuedInspectFrameAction(
        frame({ currentState: "transient", candidateEpochMismatch: true }),
      ),
    ).toEqual({ type: "drop" });
  });
});

const setInput = (overrides: Partial<SetInspectionInput> = {}): SetInspectionInput => ({
  hasHit: true,
  requestedState: "transient",
  currentState: "none",
  tooltipHovered: false,
  ...overrides,
});

describe("shouldClearInspectionAnnouncement", () => {
  it("clears only for non-null hit from keyboard or touch", () => {
    expect(shouldClearInspectionAnnouncement({ hasHit: true, source: "keyboard" })).toBe(true);
    expect(shouldClearInspectionAnnouncement({ hasHit: true, source: "touch" })).toBe(true);
  });

  it("does not clear for pointer or programmatic even with a hit", () => {
    expect(shouldClearInspectionAnnouncement({ hasHit: true, source: "pointer" })).toBe(false);
    expect(
      shouldClearInspectionAnnouncement({
        hasHit: true,
        source: "programmatic",
      }),
    ).toBe(false);
  });

  it("does not clear when there is no hit (even keyboard)", () => {
    expect(shouldClearInspectionAnnouncement({ hasHit: false, source: "keyboard" })).toBe(false);
    expect(shouldClearInspectionAnnouncement({ hasHit: false, source: "touch" })).toBe(false);
  });
});

describe("resolveSetInspectionAction", () => {
  it("ignores transient requests while pinned (even with a hit)", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: true,
          requestedState: "transient",
          currentState: "pinned",
        }),
      ),
    ).toEqual({ type: "ignore" });
  });

  it("ignores clear when tooltip is hovered", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "transient",
          tooltipHovered: true,
        }),
      ),
    ).toEqual({ type: "ignore" });
  });

  it("ignores clear while pinned even for pinned requests", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "pinned",
          currentState: "pinned",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "ignore" });
  });

  it("clears when no hit and not blocked; emitClear only when currentState is not none", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "pinned",
          currentState: "none",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "clear", emitClear: false });
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "transient",
        }),
      ),
    ).toEqual({ type: "clear", emitClear: true });
  });

  it("applies when there is a hit and not pinned-blocking-transient", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: true,
          requestedState: "pinned",
          currentState: "pinned",
        }),
      ),
    ).toEqual({ type: "apply" });
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: true,
          requestedState: "transient",
          currentState: "none",
        }),
      ),
    ).toEqual({ type: "apply" });
  });

  it("priority: pinned+transient ignore beats clear and apply", () => {
    // no hit + pinned + transient → ignore (gate 1), not clear
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "pinned",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "ignore" });
  });
});

describe("buildQueuedPointerInspection", () => {
  const hit = {
    layerIndex: 0,
    panelIndex: 0,
    rowIndex: 1,
    x: 10,
    y: 20,
    kind: "point" as const,
  };
  const match = {
    id: 3,
    mode: "xy" as const,
    autoMode: "xy" as const,
    layerIndex: 0,
    panelIndex: 0,
    rowIndex: 1,
    lineage: 0,
    x: 10,
    y: 20,
    kind: "point" as const,
  };

  it("omits mode/candidate when nearest match is null", () => {
    expect(
      buildQueuedPointerInspection({
        hit,
        source: "pointer",
        match: null,
      }),
    ).toEqual({ hit, source: "pointer" });
  });

  it("couples concreteMode and candidate from the same match object", () => {
    expect(
      buildQueuedPointerInspection({
        hit,
        source: "touch",
        match,
      }),
    ).toEqual({
      hit,
      source: "touch",
      concreteMode: "xy",
      candidate: match,
    });
  });
});

describe("buildQueuedInspectFrame", () => {
  const match = {
    id: 3,
    mode: "xy" as const,
    autoMode: "xy" as const,
    layerIndex: 1,
    panelIndex: 2,
    rowIndex: 1,
    lineage: 0,
    x: 12,
    y: 24,
    kind: "point" as const,
  };
  const fallback = {
    layerIndex: 0,
    panelIndex: 0,
    rowIndex: 9,
    x: 1,
    y: 2,
    kind: "point" as const,
  };

  it("uses fallbackHit only when match is null and leaves candidate null", () => {
    let fallbackCalls = 0;
    let panelCalls = 0;
    const built = buildQueuedInspectFrame({
      match: null,
      source: "pointer",
      epoch: 7,
      fallbackHit: () => {
        fallbackCalls += 1;
        return fallback;
      },
      panelIdForIndex: () => {
        panelCalls += 1;
        return "p0";
      },
    });
    expect(fallbackCalls).toBe(1);
    expect(panelCalls).toBe(0);
    expect(built).toEqual({
      queued: { hit: fallback, source: "pointer" },
      candidate: null,
    });
  });

  it("builds hit + queued mode + candidate from match without calling fallbackHit", () => {
    let fallbackCalls = 0;
    let panelCalls = 0;
    const built = buildQueuedInspectFrame({
      match,
      source: "touch",
      epoch: 11,
      fallbackHit: () => {
        fallbackCalls += 1;
        return fallback;
      },
      panelIdForIndex: (panelIndex) => {
        panelCalls += 1;
        expect(panelIndex).toBe(2);
        return "panel-2";
      },
    });
    expect(fallbackCalls).toBe(0);
    expect(panelCalls).toBe(1);
    expect(built.queued).toEqual({
      hit: {
        layerIndex: 1,
        panelIndex: 2,
        rowIndex: 1,
        x: 12,
        y: 24,
        kind: "point",
      },
      source: "touch",
      concreteMode: "xy",
      candidate: match,
    });
    expect(built.candidate).toEqual({
      epoch: 11,
      id: 3,
      panelId: "panel-2",
      x: 12,
      y: 24,
    });
  });
});

describe("buildInspectionCandidateRef", () => {
  it("prefers candidateId and does not call fallbackId when present", () => {
    let fallbackCalls = 0;
    expect(
      buildInspectionCandidateRef({
        epoch: 3,
        candidateId: 7,
        fallbackId: () => {
          fallbackCalls += 1;
          return -1;
        },
        panelId: "p0",
        x: 1,
        y: 2,
      }),
    ).toEqual({ epoch: 3, id: 7, panelId: "p0", x: 1, y: 2 });
    expect(fallbackCalls).toBe(0);
  });

  it("uses lazy fallbackId when candidateId is missing (incl. -1)", () => {
    expect(
      buildInspectionCandidateRef({
        epoch: 1,
        candidateId: undefined,
        fallbackId: () => -1,
        panelId: null,
        x: 10,
        y: 20,
      }),
    ).toEqual({ epoch: 1, id: -1, panelId: null, x: 10, y: 20 });
  });
});

describe("shouldCommitInspection", () => {
  it("commits when reducer kind matches requested state", () => {
    expect(
      shouldCommitInspection({
        requestedState: "transient",
        reducerKind: "transient",
      }),
    ).toBe(true);
    expect(
      shouldCommitInspection({
        requestedState: "pinned",
        reducerKind: "pinned",
      }),
    ).toBe(true);
  });

  it("abandons when reducer kind does not match requested state", () => {
    expect(
      shouldCommitInspection({
        requestedState: "transient",
        reducerKind: "pinned",
      }),
    ).toBe(false);
    expect(
      shouldCommitInspection({
        requestedState: "pinned",
        reducerKind: "transient",
      }),
    ).toBe(false);
    expect(
      shouldCommitInspection({
        requestedState: "transient",
        reducerKind: "none",
      }),
    ).toBe(false);
  });
});

const toggleInput = (
  overrides: Partial<ToggleInspectionPinInput> = {},
): ToggleInspectionPinInput => ({
  hasInspection: true,
  hasSeed: true,
  currentState: "transient",
  hasPendingPinned: false,
  ...overrides,
});

describe("resolveToggleInspectionPinAction", () => {
  it("ignores without inspection or seed", () => {
    expect(
      resolveToggleInspectionPinAction(toggleInput({ hasInspection: false, hasSeed: true })),
    ).toEqual({ type: "ignore" });
    expect(
      resolveToggleInspectionPinAction(toggleInput({ hasInspection: true, hasSeed: false })),
    ).toEqual({ type: "ignore" });
  });

  it("restores pending only when pinned with a pending payload", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "pinned",
          hasPendingPinned: true,
        }),
      ),
    ).toEqual({ type: "restore-pending" });
  });

  it("does not restore pending while transient even if pending exists", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "transient",
          hasPendingPinned: true,
        }),
      ),
    ).toEqual({ type: "flip", state: "pinned" });
  });

  it("flips pinned → transient when no pending", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "pinned",
          hasPendingPinned: false,
        }),
      ),
    ).toEqual({ type: "flip", state: "transient" });
  });

  it("flips transient → pinned", () => {
    expect(resolveToggleInspectionPinAction(toggleInput({ currentState: "transient" }))).toEqual({
      type: "flip",
      state: "pinned",
    });
  });
});

describe("resolveInspectionCompleteness", () => {
  it("is complete when pinned regardless of callbacks", () => {
    expect(
      resolveInspectionCompleteness({
        state: "pinned",
        hasCustomContent: false,
        hasInspectCallback: false,
        hasInteractionCallback: false,
      }),
    ).toBe("complete");
  });

  it("is complete when any content/callback flag is true", () => {
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: true,
        hasInspectCallback: false,
        hasInteractionCallback: false,
      }),
    ).toBe("complete");
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: false,
        hasInspectCallback: true,
        hasInteractionCallback: false,
      }),
    ).toBe("complete");
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: false,
        hasInspectCallback: false,
        hasInteractionCallback: true,
      }),
    ).toBe("complete");
  });

  it("is transient only when unpinned and all flags false", () => {
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: false,
        hasInspectCallback: false,
        hasInteractionCallback: false,
      }),
    ).toBe("transient");
  });
});

describe("resolveInspectionMode", () => {
  it("prefers concreteMode when provided", () => {
    expect(
      resolveInspectionMode({
        concreteMode: "x",
        requested: "auto",
        seedAutoMode: "xy",
      }),
    ).toBe("x");
    expect(
      resolveInspectionMode({
        concreteMode: "exact",
        requested: "y",
        seedAutoMode: "xy",
      }),
    ).toBe("exact");
  });

  it("uses seed autoMode when requested is auto", () => {
    expect(
      resolveInspectionMode({
        concreteMode: undefined,
        requested: "auto",
        seedAutoMode: "y",
      }),
    ).toBe("y");
  });

  it("uses requested mode when not auto and no concrete", () => {
    expect(
      resolveInspectionMode({
        concreteMode: undefined,
        requested: "xy",
        seedAutoMode: "exact",
      }),
    ).toBe("xy");
  });
});

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

describe("shouldAnnounceUnpin / shouldFocusPinnedInteractiveTooltip", () => {
  it("announces unpin only for transient keyboard/touch", () => {
    expect(shouldAnnounceUnpin({ state: "transient", source: "keyboard" })).toBe(true);
    expect(shouldAnnounceUnpin({ state: "transient", source: "touch" })).toBe(true);
    expect(shouldAnnounceUnpin({ state: "transient", source: "pointer" })).toBe(false);
    expect(shouldAnnounceUnpin({ state: "pinned", source: "keyboard" })).toBe(false);
  });

  it("focuses tooltip only when pinned with interactive content", () => {
    expect(
      shouldFocusPinnedInteractiveTooltip({
        state: "pinned",
        contentMode: "interactive",
      }),
    ).toBe(true);
    expect(
      shouldFocusPinnedInteractiveTooltip({
        state: "pinned",
        contentMode: "informational",
      }),
    ).toBe(false);
    expect(
      shouldFocusPinnedInteractiveTooltip({
        state: "transient",
        contentMode: "interactive",
      }),
    ).toBe(false);
  });
});

describe("shouldClosePinnedOnOutsidePointer", () => {
  it("closes only when pinned and target is outside the root", () => {
    expect(shouldClosePinnedOnOutsidePointer({ isPinned: true, targetInsideRoot: false })).toBe(
      true,
    );
  });

  it("does not close when not pinned", () => {
    expect(shouldClosePinnedOnOutsidePointer({ isPinned: false, targetInsideRoot: false })).toBe(
      false,
    );
  });

  it("does not close when target is inside the root", () => {
    expect(shouldClosePinnedOnOutsidePointer({ isPinned: true, targetInsideRoot: true })).toBe(
      false,
    );
  });

  it("does not close when unpinned and inside", () => {
    expect(shouldClosePinnedOnOutsidePointer({ isPinned: false, targetInsideRoot: true })).toBe(
      false,
    );
  });
});

describe("resolveInspectionEmitAction", () => {
  it("emits without updating last when fingerprint is undefined", () => {
    expect(
      resolveInspectionEmitAction({
        fingerprint: undefined,
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: null });
  });

  it("skips when fingerprint equals last, including empty string (host inits last to '')", () => {
    expect(
      resolveInspectionEmitAction({
        fingerprint: "",
        lastFingerprint: "",
      }),
    ).toEqual({ type: "skip" });
    expect(
      resolveInspectionEmitAction({
        fingerprint: "sem:a",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "skip" });
  });

  it("emits and updates when fingerprint changes", () => {
    expect(
      resolveInspectionEmitAction({
        fingerprint: "sem:b",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: "sem:b" });
  });

  it("characterizes a stateful sequence including clear tokens", () => {
    let last = "";
    const step = (fingerprint?: string) => {
      const action = resolveInspectionEmitAction({ fingerprint, lastFingerprint: last });
      if (action.type === "emit" && action.updateFingerprint !== null)
        last = action.updateFingerprint;
      return action;
    };

    // omitted fingerprint never mutates last
    expect(step()).toEqual({ type: "emit", updateFingerprint: null });
    expect(last).toBe("");

    // empty fingerprint collides with initial last → skip
    expect(step("")).toEqual({ type: "skip" });
    expect(last).toBe("");

    // first real fingerprint updates
    expect(step("sem:1")).toEqual({ type: "emit", updateFingerprint: "sem:1" });
    expect(last).toBe("sem:1");

    // equal suppresses
    expect(step("sem:1")).toEqual({ type: "skip" });
    expect(last).toBe("sem:1");

    // clear token after semantic → emit and update
    expect(step("clear:keyboard")).toEqual({
      type: "emit",
      updateFingerprint: "clear:keyboard",
    });
    expect(last).toBe("clear:keyboard");

    // same clear token suppresses
    expect(step("clear:keyboard")).toEqual({ type: "skip" });
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
