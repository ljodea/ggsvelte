/**
 * Inspection controller extracted from GGPlot for S6.
 *
 * Owns inspection $state, inspectionSeed, lastInspectionFingerprint,
 * activeCandidateId, construction-time deriveds (inspectionPanel), the
 * coordinator, private resolve/emit helpers, public set/toggle/dismiss/
 * close/traversal methods, and phased effects (coordinator disposal +
 * scene-reconcile). Pointer-inspect queue ownership lives in
 * pointer-inspect.ts (schedule / cancel / onFrame / pending pin stash).
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
import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";

import type { PanelBounds } from "../scene/geometry.js";

import { createInspectionCoordinator } from "./coordinator.js";
import type { createInteractionReducer } from "../interaction/reducer.js";
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
  resolveInspectionCompleteness,
  resolveInspectionMode,
  resolveSetInspectionAction,
  resolveToggleInspectionPinAction,
  shouldAnnounceUnpin,
  shouldClearInspectionAnnouncement,
  shouldFocusPinnedInteractiveTooltip,
} from "./apply.js";
import {
  createPointerInspectQueue,
  type CancelPointerInspectPolicy,
  type InspectPointerFrameAction,
  type SchedulePointerInspectInput,
} from "./pointer-inspect.js";
import {
  applySceneInspectReconcile,
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

/** Panel geometry for crosshairs / keyboard clamp; id for scene lookups. */
type InspectionPanelBounds = PanelBounds & { readonly id: string };

export type InspectionState = {
  readonly inspection: PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null;
  readonly inspectionPanel: InspectionPanelBounds | null;
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

  function clearDismissedLatch(): void {
    dismissedCandidateId = null;
    dismissedRunId = null;
  }

  // Queue factory stores thunks only — does not call model/reducer at
  // construction (armed-getter suite). setInspection is a function
  // declaration (hoisted) so the apply-pending re-entry closes correctly.
  const pointerQueue = createPointerInspectQueue({
    model: () => deps.model(),
    reducer: () => reducerOf(),
    inspectionState: () => (inspection === null ? "none" : inspection.state),
    setInspection: (hit, source, state, concreteMode, candidate) => {
      setInspection(hit, source, state, concreteMode, candidate);
    },
  });

  // Construction-safe: own state + earlier host model.
  // Key off the inspection snapshot's panelId (authoritative from the seed
  // candidate), not a re-hit of focus.anchor geometry (#787). Bounds come
  // from the semantic viewport — no scene.panels.find round-trip.
  const inspectionPanel = $derived.by((): InspectionPanelBounds | null => {
    if (inspection === null || deps.model() === null) return null;
    const panelId = inspection.panelId;
    if (panelId === null) return null;
    const viewportPanel = deps.model()!.viewport.panel(panelId);
    if (viewportPanel === null) return null;
    const { x0, y0, x1, y1 } = viewportPanel.bounds;
    return {
      id: viewportPanel.id,
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
    };
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
      pointerQueue.cancel({ pendingPinned: "preserve" });
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
        // Clear ends the session — discard any orphan pending pin stash so a
        // later re-pin cannot restore-pending a pre-clear candidate (#856).
        pointerQueue.cancel({ pendingPinned: "discard" });
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
    pointerQueue.cancel({ pendingPinned: "preserve" });
    const pinAction = resolveToggleInspectionPinAction({
      hasInspection: inspection !== null,
      hasSeed: inspectionSeed !== null,
      currentState: inspection?.state ?? "transient",
      pending: pointerQueue.peekPendingPinned(),
    });
    if (pinAction.type === "ignore") return;
    switch (pinAction.type) {
      case "restore-pending": {
        // Consume stash (read+clear) so a second toggle cannot re-restore.
        pointerQueue.takePendingPinned();
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
    // discard policy already clears pending pin stash — no second clear.
    pointerQueue.cancel({
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

  function schedulePointerInspect(input: SchedulePointerInspectInput): void {
    pointerQueue.schedule(input);
  }

  function cancelPointerInspect(policy: CancelPointerInspectPolicy): void {
    pointerQueue.cancel(policy);
  }

  function onInspectPointerFrame(action: InspectPointerFrameAction): boolean {
    return pointerQueue.onFrame(action);
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
    // Thin plan → apply shell (#855). getInspectionState stays a thunk so
    // same-run skip does not subscribe to hover inspection updates.
    applySceneInspectReconcile(plan, {
      model: currentModel,
      dataIdentityEpoch: deps.dataIdentityEpoch,
      clearInspection() {
        inspection = null;
        inspectionSeed = null;
      },
      setInspectionFromReconcile({ snapshot, seed }) {
        inspection = snapshot;
        inspectionSeed = seed;
      },
      setActiveCandidateId(id) {
        activeCandidateId = id;
      },
      clearDismissedLatch,
      setReconciledRun(runId) {
        reconciledRun = runId;
      },
      dispatchSceneInvalidate() {
        reducerOf().dispatch({ type: "invalidate", reason: "scene" });
      },
      cancelPointerDiscardPending() {
        pointerQueue.cancel({ pendingPinned: "discard" });
      },
      clearPointerForSceneInvalidate() {
        pointerQueue.clearForSceneInvalidate();
      },
      coordinatorInvalidate() {
        inspectionCoordinator.invalidate();
      },
      releaseTransient() {
        inspectionCoordinator.release("transient");
      },
      reconcilePinned(input) {
        return inspectionCoordinator.reconcilePinned({
          ...input,
          source: "programmatic",
          completeness: "complete",
        });
      },
      emitClearProgrammatic() {
        emitInspection({
          type: "inspect",
          phase: "clear",
          source: "programmatic",
        });
      },
      emitSemanticChange(snapshot, semanticFingerprint) {
        emitInspection(snapshot, semanticFingerprint);
      },
    });
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
