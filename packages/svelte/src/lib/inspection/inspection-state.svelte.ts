/**
 * Inspection controller extracted from GGPlot for S6.
 *
 * Owns inspection $state, inspectionSeed, lastInspectionFingerprint,
 * activeCandidateId, pointer-queue fields (queuedPointerToken,
 * queuedPointerInspection, pendingPinnedPointer), construction-time deriveds
 * (inspectionPanel, traversalHits), the coordinator, private resolve/emit
 * helpers, public set/toggle/dismiss/close/traversal/queue methods, and
 * phased effects (coordinator disposal + scene-reconcile).
 *
 * Factory sits at the original queue-vars position (before the component-held
 * reducer). Construction-time deriveds read inspection (own) and model only.
 * Armed later-declared / handler-only deps for the
 * construction guard: captureSurface, tooltipHovered,
 * clearTooltipHovered, keyAt, inspectEnabled, oninspect, oninteraction.
 *
 * Cross-module dismiss side effects (clearBrush / returnToInspect) are applied
 * by the transition owner / surface — not via sibling surface deps (#627).
 *
 * Scene-reconcile + coordinator disposal effects register inside this factory.
 */
import type { CandidateFacts, CellValue, RenderModel, ScenePanel } from "@ggsvelte/core";

import { createInspectionCoordinator } from "./coordinator.js";
import type { createInteractionReducer, InteractionAction } from "../interaction/reducer.js";
import type {
  InteractionSource,
  PlotInspection,
  PlotInspectionChange,
  PlotInteractionEvent,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { inspectionLiveText as inspectionLiveTextFor } from "../assembly/labels.js";
import { plotTooltipDomId } from "../assembly/layout.js";
import { hitFromCandidate, type SceneHit } from "../surface/plot-px.js";
import {
  buildQueuedInspectFrame,
  resolveQueuedInspectFrameAction,
  type QueuedPointerInspection,
} from "./frame.js";
import {
  resolveInspectionCompleteness,
  resolveInspectionMode,
  resolveSetInspectionAction,
  resolveToggleInspectionPinAction,
  shouldAnnounceUnpin,
  shouldClearInspectionAnnouncement,
  shouldFocusPinnedInteractiveTooltip,
} from "./apply.js";
import {
  planInspectionDismiss,
  planSceneInspectReconcile,
  resolveInspectionEmitAction,
  type InspectionDismissPlan,
} from "./teardown.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Component-held reducer shape — factory-only export from interaction/reducer. */
type InteractionReducer = ReturnType<typeof createInteractionReducer>;

/** Inspect frame action delivered to onPointerFrame (non-move-area branch). */
type InspectPointerFrameAction = Extract<InteractionAction, { type: "inspect" }>;

export type InspectionStateDeps = {
  model: () => RenderModel | null;
  /**
   * Shared interaction reducer. Prefer a concrete instance from the assembly
   * (constructed before this factory) so inspection does not close over surface.
   */
  reducer: InteractionReducer | (() => InteractionReducer);
  inspectConfig: () => ResolvedInteractionConfig["inspect"];
  inspectEnabled: () => boolean;
  dataIdentityEpoch: () => string;
  /**
   * Semantic key at row index — closes over the later semantic-key service.
   * Handler-only (coordinator resolve paths); never invoked at construction.
   */
  keyAt: (index: number) => PropertyKey | null;
  root: () => HTMLDivElement | null;
  captureSurface: () => HTMLDivElement | null;
  plotId: () => string;
  tooltipHovered: () => boolean;
  clearTooltipHovered: () => void;
  oninspect: () => ((event: PlotInspection<Record<string, CellValue>>) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  /** Stable sinks over the announcer. */
  announce: (message: string) => void;
  clearAnnouncement: () => void;
};

function resolveReducer(reducer: InspectionStateDeps["reducer"]): InteractionReducer {
  return typeof reducer === "function" ? reducer() : reducer;
}

/** Intent for a coalesced pointer-inspect frame (nearest lookup owned here). */
type SchedulePointerInspectInput = {
  readonly point: Readonly<{ x: number; y: number }>;
  readonly source: InteractionSource;
  readonly mode: "auto" | "exact" | "x" | "y" | "xy";
  readonly maxDistance: number;
};

/** Cancel policy for pending pointer-inspect work. */
type CancelPointerInspectPolicy = {
  /** Leave/clear: discard stash. Cancel/down/blur tool paths: preserve. */
  readonly pendingPinned: "preserve" | "discard";
};

export type InspectionState = {
  readonly inspection: PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null;
  readonly inspectionPanel: ScenePanel | null;
  /** Seed candidate for presentation chrome (kind); not emitted on public events. */
  readonly inspectionSeed: CandidateFacts | null;
  setInspection(
    hit: SceneHit | null,
    source: InteractionSource,
    state?: "transient" | "pinned",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ): void;
  toggleInspectionPin(source: InteractionSource): void;
  /**
   * Local dismiss only. Cross-module plan tails (clearBrush / returnToInspect)
   * are applied by `applyInspectionDismissSideEffects` at the call site.
   */
  dismissInspection(
    kind: "escape" | "close",
    source: InteractionSource,
    opts?: { restoreFocus?: boolean; returnToInspect?: boolean },
  ): InspectionDismissPlan;
  closeInspection(source: InteractionSource, restoreFocus?: boolean): InspectionDismissPlan;
  navigate(delta: number): void;
  navigateDirection(dx: number, dy: number): void;
  cycleCoincident(delta: number): void;
  /** Blur-path reset; scene-reconcile does NOT reset the index. */
  resetTraversalIndex(): void;
  /**
   * Schedule a coalesced pointer-inspect frame from pointer intent.
   * Owns nearest/hitTest, queue payload+token, and reducer.queuePointer.
   */
  schedulePointerInspect(input: SchedulePointerInspectInput): void;
  /**
   * Cancel pending inspect schedule + clear queued payload.
   * Does not cancel move-area (typed cancel on the reducer).
   */
  cancelPointerInspect(policy: CancelPointerInspectPolicy): void;
  /**
   * Reducer onPointerFrame inspect branch sink.
   * Returns false when the frame is dropped so the reducer skips dispatch.
   */
  onInspectPointerFrame(action: InspectPointerFrameAction): boolean;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the inspection controller. Construction registers deriveds and
 * coordinator disposal + scene-reconcile effects.
 *
 * Construction-order note: deps must not be invoked during construction —
 * construction-read discipline enforced by the armed-getter suite.
 */
export function createInspectionState(deps: InspectionStateDeps): InspectionState {
  const reducerOf = (): InteractionReducer => resolveReducer(deps.reducer);
  let inspection = $state<PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null>(
    null,
  );
  let inspectionSeed: CandidateFacts | null = null;
  let lastInspectionFingerprint = "";
  let activeCandidateId: number | null = null;
  /**
   * Same-candidate suppression after dismiss of a *transient* inspection
   * (Escape). Pinned dismiss does not set the latch. Cleared on different
   * candidate apply, effective null-clear, and scene invalidate.
   */
  let dismissedCandidateId: number | null = null;
  let dismissedRunId: number | null = null;

  let queuedPointerToken: {
    readonly epoch: number;
    readonly revision: number;
  } | null = null;
  let queuedPointerInspection: QueuedPointerInspection | null = null;
  let pendingPinnedPointer: QueuedPointerInspection | null = null;

  function clearDismissedLatch(): void {
    dismissedCandidateId = null;
    dismissedRunId = null;
  }

  /** Cancel inspect schedule + payload; optional stash clear. */
  function invalidatePointerInspect(policy: CancelPointerInspectPolicy): void {
    cancelPointerInspect(policy);
  }

  // Construction-safe: own state + earlier host model.
  const inspectionPanel = $derived.by(() => {
    if (inspection === null || deps.model() === null) return null;
    const model = deps.model()!;
    const viewportPanel = model.viewport.panelAt(inspection.focus.anchor);
    return model.scene.panels.find((panel) => panel.id === viewportPanel?.id) ?? null;
  });

  // Coordinator closes over keyAt — handler-only invocation (deferred).
  const inspectionCoordinator = createInspectionCoordinator<Record<string, CellValue>, PropertyKey>(
    (_row, index) => deps.keyAt(index),
  );

  let reconciledRun = -1;

  function resolveInspection(
    hit: SceneHit,
    source: InteractionSource,
    state: "transient" | "pinned" = "transient",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ) {
    const model = deps.model();
    if (model === null) throw new Error("Cannot resolve inspection without a render model");
    const seed =
      candidate ?? model.candidates.nearest(hit.x, hit.y, { mode: "exact", maxDistance: 0 });
    if (seed === null) throw new Error("Inspection hit was not present in the candidate store");
    const requested = deps.inspectConfig()?.mode ?? "auto";
    const mode = resolveInspectionMode({
      concreteMode,
      requested,
      seedAutoMode: seed.autoMode,
    });
    return inspectionCoordinator.resolve({
      model,
      seed,
      mode,
      state,
      source,
      identityEpoch: deps.dataIdentityEpoch(),
      layoutEpoch: model.runId,
      completeness: resolveInspectionCompleteness({
        state,
        hasCustomContent: deps.inspectConfig()?.content !== undefined,
        hasInspectCallback: deps.oninspect() !== undefined,
        hasInteractionCallback: deps.oninteraction() !== undefined,
      }),
    });
  }

  function emitInspection(
    next: PlotInspection<Record<string, CellValue>>,
    semanticFingerprint?: string,
  ): void {
    const emit = resolveInspectionEmitAction({
      phase: next.phase,
      source: next.source,
      semanticFingerprint,
      lastFingerprint: lastInspectionFingerprint,
    });
    if (emit.type === "skip") return;
    if (emit.updateFingerprint !== null) lastInspectionFingerprint = emit.updateFingerprint;
    deps.oninspect()?.(next);
    deps.oninteraction()?.(next);
  }

  function inspectionLiveText(
    value: PlotInspectionChange<Record<string, CellValue>, PropertyKey>,
  ): string {
    return inspectionLiveTextFor(deps.model(), value);
  }

  function setInspection(
    hit: SceneHit | null,
    source: InteractionSource,
    state: "transient" | "pinned" = "transient",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ): void {
    // Announcement clear runs before priority gates (including ignored
    // keyboard/touch requests while pinned).
    if (
      shouldClearInspectionAnnouncement({
        hasHit: hit !== null,
        source,
      })
    )
      deps.clearAnnouncement();
    // Direct applies (keyboard/touch/programmatic) must cancel queued hover /
    // touch-move inspect frames so a pending rAF cannot override the apply
    // (e.g. touch tap after a sub-threshold touch move scheduled inspect).
    // Pointer hover keeps the queue so successive move frames coalesce.
    if (source !== "pointer") {
      invalidatePointerInspect({ pendingPinned: "preserve" });
    }
    const action = resolveSetInspectionAction({
      hasHit: hit !== null,
      requestedState: state,
      currentState: inspection === null ? "none" : inspection.state,
      tooltipHovered: deps.tooltipHovered(),
    });
    switch (action.type) {
      case "ignore":
        return;
      case "clear": {
        if (action.emitClear) emitInspection({ type: "inspect", phase: "clear", source });
        inspection = null;
        inspectionSeed = null;
        clearDismissedLatch();
        inspectionCoordinator.release("transient");
        return;
      }
      case "apply": {
        // hit is non-null when action is apply (pure gate).
        const resolved = resolveInspection(hit!, source, state, concreteMode, candidate);
        // Null resolve re-enters clear gates via setInspection(null, source).
        if (resolved === null) {
          setInspection(null, source);
          return;
        }
        const runId = deps.model()?.runId ?? 0;
        // Same-candidate dismiss latch (Escape on transient).
        if (
          dismissedCandidateId === resolved.seed.id &&
          dismissedRunId === runId &&
          state === "transient"
        )
          return;
        if (dismissedCandidateId !== null && dismissedCandidateId !== resolved.seed.id)
          clearDismissedLatch();
        inspection = resolved.snapshot;
        inspectionSeed = resolved.seed;
        activeCandidateId = resolved.seed.id;
        if (resolved.semanticChanged)
          emitInspection(resolved.snapshot, resolved.semanticFingerprint);
      }
    }
  }

  function toggleInspectionPin(source: InteractionSource): void {
    invalidatePointerInspect({ pendingPinned: "preserve" });
    const pinAction = resolveToggleInspectionPinAction({
      hasInspection: inspection !== null,
      hasSeed: inspectionSeed !== null,
      currentState: inspection?.state ?? "transient",
      pending: pendingPinnedPointer,
    });
    if (pinAction.type === "ignore") return;
    switch (pinAction.type) {
      case "restore-pending": {
        pendingPinnedPointer = null;
        inspectionCoordinator.release("pinned");
        inspection = null;
        inspectionSeed = null;
        setInspection(
          pinAction.pending.hit,
          pinAction.pending.source,
          "transient",
          pinAction.pending.concreteMode,
          pinAction.pending.candidate,
        );
        return;
      }
      case "flip": {
        const nextState = pinAction.state;
        const resolved = resolveInspection(
          hitFromCandidate(inspectionSeed!),
          source,
          nextState,
          inspection!.mode,
          inspectionSeed!,
        );
        if (resolved === null) return;
        inspection = resolved.snapshot;
        inspectionSeed = resolved.seed;
        if (nextState === "transient") inspectionCoordinator.release("pinned");
        if (shouldAnnounceUnpin({ state: nextState, source }))
          deps.announce(`${inspectionLiveText(resolved.snapshot)}, unpinned`);
        if (resolved.semanticChanged)
          emitInspection(resolved.snapshot, resolved.semanticFingerprint);
        if (
          shouldFocusPinnedInteractiveTooltip({
            state: nextState,
            contentMode: deps.inspectConfig()?.contentMode,
          })
        )
          queueMicrotask(() =>
            deps
              .root()
              ?.querySelector<HTMLElement>(`#${CSS.escape(plotTooltipDomId(deps.plotId()))}`)
              ?.focus(),
          );
      }
    }
  }

  /**
   * Shared dismiss path for Escape and closeInspection.
   * Escape also cancels area via reducer; close does not masquerade as Escape.
   */
  function dismissInspection(
    kind: "escape" | "close",
    source: InteractionSource,
    opts: { restoreFocus?: boolean; returnToInspect?: boolean } = {},
  ): InspectionDismissPlan {
    const plan = planInspectionDismiss({
      kind,
      hasInspection: inspection !== null,
      ...(opts.restoreFocus !== undefined && {
        restoreFocus: opts.restoreFocus,
      }),
      ...(opts.returnToInspect !== undefined && {
        returnToInspect: opts.returnToInspect,
      }),
    });
    invalidatePointerInspect({
      pendingPinned: plan.clearPendingPinned ? "discard" : "preserve",
    });
    // Latch only when dismissing a *transient* inspection (Escape path).
    if (inspection?.state === "transient" && inspectionSeed !== null) {
      dismissedCandidateId = inspectionSeed.id;
      dismissedRunId = deps.model()?.runId ?? null;
    } else if (inspection?.state === "pinned") {
      clearDismissedLatch();
    }
    // Real Escape cancels area + bumps epoch; close does not.
    if (kind === "escape") reducerOf().dispatch({ type: "escape", source });
    if (plan.emitClear) emitInspection({ type: "inspect", phase: "clear", source });
    inspection = null;
    inspectionSeed = null;
    if (plan.clearTooltipHovered) deps.clearTooltipHovered();
    if (plan.clearPendingPinned) pendingPinnedPointer = null;
    if (plan.coordinator === "invalidate") inspectionCoordinator.invalidate();
    else inspectionCoordinator.release("pinned");
    // Cross-module clearBrush / returnToInspect: caller applies via
    // applyInspectionDismissSideEffects (surface / transition owner).
    if (plan.restoreFocus) queueMicrotask(() => deps.captureSurface()?.focus());
    return plan;
  }

  function closeInspection(source: InteractionSource, restoreFocus = true): InspectionDismissPlan {
    return dismissInspection("close", source, { restoreFocus });
  }

  function applyCandidateId(id: number | null): void {
    if (id === null) return;
    const candidate = deps.model()?.candidates.candidate(id);
    if (candidate === null || candidate === undefined) return;
    activeCandidateId = id;
    setInspection(hitFromCandidate(candidate), "keyboard", "transient", undefined, candidate);
  }

  function navigate(delta: number): void {
    const store = deps.model()?.candidates;
    if (store === undefined || store.size === 0) return;
    const direction = delta < 0 ? "previous" : "next";
    applyCandidateId(store.traverse(activeCandidateId, direction, Math.abs(delta)));
  }

  function navigateDirection(dx: number, dy: number): void {
    const store = deps.model()?.candidates;
    if (store === undefined || store.size === 0) return;
    if (inspection === null || activeCandidateId === null) {
      applyCandidateId(store.traverse(activeCandidateId, "next"));
      return;
    }
    const direction = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : dy > 0 ? "down" : "next";
    applyCandidateId(store.traverse(activeCandidateId, direction));
  }

  function cycleCoincident(delta: number): void {
    const store = deps.model()?.candidates;
    if (store === undefined || store.size === 0) return;
    if (inspection === null || activeCandidateId === null) {
      applyCandidateId(store.traverse(activeCandidateId, "next"));
      return;
    }
    applyCandidateId(store.cycle(activeCandidateId, delta));
  }

  function resetTraversalIndex(): void {
    activeCandidateId = null;
  }

  function panelIdForIndex(index: number): string | null {
    const panel = deps.model()?.scene.panels[index];
    if (panel === undefined) return null;
    return panel.id;
  }

  function schedulePointerInspect(input: SchedulePointerInspectInput): void {
    const model = deps.model();
    const match =
      model?.candidates.nearest(input.point.x, input.point.y, {
        mode: input.mode,
        maxDistance: input.maxDistance,
      }) ?? null;
    const frame = buildQueuedInspectFrame({
      match,
      source: input.source,
      epoch: model?.runId ?? 0,
      fallbackCandidate: () => model?.candidates.hitTest(input.point.x, input.point.y) ?? null,
      panelIdForIndex,
    });
    const reducer = reducerOf();
    queuedPointerInspection = frame.queued;
    queuedPointerToken = reducer.frameToken();
    try {
      reducer.queuePointer({
        type: "inspect",
        candidate: frame.candidate,
        source: input.source,
      });
    } catch (error) {
      // No orphan payload if scheduling throws (Codex plan review).
      queuedPointerInspection = null;
      queuedPointerToken = null;
      throw error;
    }
  }

  function cancelPointerInspect(policy: CancelPointerInspectPolicy): void {
    queuedPointerInspection = null;
    if (policy.pendingPinned === "discard") pendingPinnedPointer = null;
    reducerOf().cancelScheduledPointer("inspect");
  }

  /**
   * Inspect branch of onPointerFrame. Returns false on drop so the reducer
   * skips dispatch (atomic with InspectionState — Codex plan review).
   */
  function onInspectPointerFrame(action: InspectPointerFrameAction): boolean {
    // Snapshot then clear queues before pure routing (matches prior host).
    const pending = queuedPointerInspection;
    const token = queuedPointerToken;
    queuedPointerInspection = null;
    queuedPointerToken = null;
    // Short-circuit tokenAccepted when no pending so accepts() is not
    // called for empty frames (Codex plan review).
    const frameAction = resolveQueuedInspectFrameAction({
      hasPending: pending !== null,
      tokenAccepted: pending === null || token === null || reducerOf().accepts(token),
      currentState: inspection === null ? "none" : inspection.state,
      candidateEpochMismatch:
        action.candidate !== null && action.candidate.epoch !== deps.model()?.runId,
    });
    switch (frameAction.type) {
      case "none":
        // Empty frame: still allow reducer dispatch (prior host behavior when
        // payload was cleared but a scheduled inspect still flushed).
        return true;
      case "drop":
        return false;
      case "stash-pending":
        if (pending !== null) pendingPinnedPointer = pending;
        return true;
      case "apply-pending":
        if (pending !== null) {
          setInspection(
            pending.hit,
            pending.source,
            "transient",
            pending.concreteMode,
            pending.candidate,
          );
        }
        return true;
    }
    return true;
  }

  // Coordinator disposal + scene-run reconcile (formerly host-phased
  // registerInspectionEffects — registered at construction, #627).
  $effect(() => {
    return () => {
      inspectionCoordinator.invalidate();
    };
  });

  $effect(() => {
    const currentModel = deps.model();
    const plan = planSceneInspectReconcile({
      inspectionEnabled: deps.inspectEnabled(),
      // Thunk: do not read `inspection` on the same-run skip path so hover
      // updates are not effect dependencies of scene-run reconcile.
      getInspectionState: () => (inspection === null ? "none" : inspection.state),
      modelRunId: currentModel?.runId ?? null,
      reconciledRun,
    });
    switch (plan.type) {
      case "noop":
      case "skip":
        return;
      case "clear-disabled":
        inspectionCoordinator.invalidate();
        inspection = null;
        inspectionSeed = null;
        clearDismissedLatch();
        invalidatePointerInspect({ pendingPinned: "discard" });
        return;
      case "invalidate-clear-transient":
      case "invalidate-idle":
      case "invalidate-reconcile-pinned": {
        // currentModel is non-null for invalidate-* (plan requires run advance).
        const runId = currentModel!.runId;
        reducerOf().dispatch({ type: "invalidate", reason: "scene" });
        queuedPointerInspection = null;
        pendingPinnedPointer = null;
        queuedPointerToken = null;
        reducerOf().cancelScheduledPointer();
        clearDismissedLatch();
        reconciledRun = runId;
        if (plan.type === "invalidate-clear-transient") {
          inspectionCoordinator.release("transient");
          inspection = null;
          inspectionSeed = null;
          return;
        }
        if (plan.type === "invalidate-idle") return;
        const reconciled = inspectionCoordinator.reconcilePinned({
          model: currentModel!,
          identityEpoch: deps.dataIdentityEpoch(),
          layoutEpoch: runId,
          source: "programmatic",
          completeness: "complete",
        });
        if (reconciled === null) {
          // Failed pinned reconcile: clear inspection only (not area Escape).
          emitInspection({
            type: "inspect",
            phase: "clear",
            source: "programmatic",
          });
          inspection = null;
          inspectionSeed = null;
        } else {
          inspection = reconciled.snapshot;
          inspectionSeed = reconciled.seed;
          activeCandidateId = reconciled.seed.id;
          if (reconciled.semanticChanged)
            emitInspection(reconciled.snapshot, reconciled.semanticFingerprint);
        }
        break;
      }
    }
  });

  return {
    get inspection() {
      return inspection;
    },
    get inspectionPanel() {
      return inspectionPanel;
    },
    /** Internal seed for presentation chrome (kind); not part of the public inspection event. */
    get inspectionSeed() {
      return inspectionSeed;
    },
    setInspection,
    toggleInspectionPin,
    dismissInspection,
    closeInspection,
    navigate,
    navigateDirection,
    cycleCoincident,
    resetTraversalIndex,
    schedulePointerInspect,
    cancelPointerInspect,
    onInspectPointerFrame,
  };
}
