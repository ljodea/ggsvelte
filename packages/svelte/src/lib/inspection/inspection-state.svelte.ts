/**
 * Inspection controller extracted from GGPlot for S6.
 *
 * Owns inspection $state, inspectionSeed, lastInspectionFingerprint,
 * activeTraversalIndex, pointer-queue fields (queuedPointerToken,
 * queuedPointerInspection, pendingPinnedPointer), construction-time deriveds
 * (inspectionPanel, traversalHits), the coordinator, private resolve/emit
 * helpers, public set/toggle/dismiss/close/traversal/queue methods, and
 * phased effects (coordinator disposal + scene-reconcile).
 *
 * Factory sits at the original queue-vars position (before the component-held
 * reducer). Construction-time deriveds read inspection (own), model, and
 * surfaceInteractive only. Armed later-declared / handler-only deps for the
 * construction guard: reducer, captureSurface, tooltipHovered,
 * clearTooltipHovered, keyAt, inspectEnabled, chooseTool, clearBrush,
 * oninspect, oninteraction.
 *
 * Effects register via registerInspectionEffects() at the original coordinator
 * site (after legend-focus reconcile); effect-registration order is load-bearing.
 */
import type { CandidateFacts, CellValue, RenderModel, ScenePanel } from "@ggsvelte/core";
import type { SceneHit } from "@ggsvelte/core/dom";

import { createInspectionCoordinator } from "./resolver.js";
import type {
  createInteractionReducer,
  InteractionAction,
  InteractionFrameToken,
} from "../interaction/reducer.js";
import type {
  InteractionSource,
  PlotInspection,
  PlotInspectionChange,
  PlotInteractionEvent,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { inspectionLiveText as inspectionLiveTextFor } from "../assembly/labels.js";
import { plotTooltipDomId } from "../assembly/layout.js";
import { panelContainingAnchor } from "../scene/geometry.js";
import {
  bestDirectionalIndex,
  buildTraversalEntries,
  cycleCoincidentIndex,
  hitFromCandidate,
  matchCandidateFromHit,
  nextTraversalIndex,
  planCycleCoincident,
  planDirectionalNavigate,
} from "../surface/plot-px.js";
import {
  buildInspectionCandidateRef,
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
  shouldCommitInspection,
  shouldFocusPinnedInteractiveTooltip,
} from "./apply.js";
import {
  planInspectionDismiss,
  planSceneInspectReconcile,
  resolveInspectionEmitAction,
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
   * Component-held reducer (plan mandate). Deferred: declared AFTER the
   * factory — handler/effect-only reads.
   */
  reducer: () => InteractionReducer;
  inspectConfig: () => ResolvedInteractionConfig["inspect"];
  surfaceInteractive: () => boolean;
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
  /** S7 state still host-held: dismiss plan.clearBrush → brushRect = null. */
  clearBrush: () => void;
  /** S7 fn still host-held: dismiss plan.returnToInspect. */
  chooseTool: (tool: "inspect") => void;
  oninspect: () => ((event: PlotInspection<Record<string, CellValue>>) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  /** Stable sinks over the announcer. */
  announce: (message: string) => void;
  clearAnnouncement: () => void;
};

export type InspectionState = {
  readonly inspection: PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null;
  readonly inspectionPanel: ScenePanel | null;
  setInspection(
    hit: SceneHit | null,
    source: InteractionSource,
    state?: "transient" | "pinned",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ): void;
  toggleInspectionPin(source: InteractionSource): void;
  dismissInspection(
    kind: "escape" | "close",
    source: InteractionSource,
    opts?: { restoreFocus?: boolean; returnToInspect?: boolean },
  ): void;
  closeInspection(source: InteractionSource, restoreFocus?: boolean): void;
  navigate(delta: number): void;
  navigateDirection(dx: number, dy: number): void;
  cycleCoincident(delta: number): void;
  /** Blur-path reset; scene-reconcile does NOT reset the index. */
  resetTraversalIndex(): void;
  /**
   * Reducer onPointerFrame non-move-area branch: snapshot-then-clear queues,
   * pure route, stash or setInspection apply.
   */
  applyQueuedInspectFrame(action: InspectPointerFrameAction): void;
  queuePointerFrame(queued: QueuedPointerInspection, token: InteractionFrameToken): void;
  /** Clears ONLY the queued payload (token stays). Matches every host clear site. */
  clearQueuedPointer(): void;
  clearPendingPinned(): void;
  /** Register disposal + scene-reconcile effects at the original host site. */
  registerInspectionEffects(): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the inspection controller. Construction registers only the
 * construction-time deriveds (inspectionPanel, traversalHits). Call
 * `registerInspectionEffects` at the original coordinator position after
 * legend-focus reconcile effects.
 *
 * Construction-order note: deps must not be invoked during construction —
 * construction-read discipline enforced by the armed-getter suite.
 */
export function createInspectionState(deps: InspectionStateDeps): InspectionState {
  let inspection = $state<PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null>(
    null,
  );
  let inspectionSeed: CandidateFacts | null = null;
  let lastInspectionFingerprint = "";
  let activeTraversalIndex = $state(-1);

  let queuedPointerToken: {
    readonly epoch: number;
    readonly revision: number;
  } | null = null;
  let queuedPointerInspection: QueuedPointerInspection | null = null;
  let pendingPinnedPointer: QueuedPointerInspection | null = null;

  // Construction-safe: own state + earlier host model / surfaceInteractive.
  const inspectionPanel = $derived.by(() => {
    if (inspection === null || deps.model() === null) return null;
    return panelContainingAnchor(deps.model()!.scene.panels, inspection.focus.anchor);
  });

  // Parallel hits + candidate ids: keyboard apply O(1)-fetches
  // candidates.candidate(id) so resolveInspection does not re-scan the full
  // store (O(C) matchCandidateFromHit). Ids only — not full CandidateFacts —
  // so large charts do not retain every facts object for the model lifetime.
  const traversal = $derived.by(() => {
    if (!deps.surfaceInteractive() || deps.model() === null)
      return { hits: [] as SceneHit[], candidateIds: [] as number[] };
    return buildTraversalEntries(deps.model()!.candidates);
  });
  const traversalHits: SceneHit[] = $derived(traversal.hits);

  // Coordinator closes over keyAt — handler-only invocation (deferred).
  const inspectionCoordinator = createInspectionCoordinator<Record<string, CellValue>, PropertyKey>(
    (_row, index) => deps.keyAt(index),
  );

  let reconciledRun = -1;

  function candidateFromHit(hit: SceneHit): CandidateFacts | null {
    const model = deps.model();
    if (model === null) return null;
    // Spatial shortlist via CandidateStore.queryRect (O(log C + k)); do not
    // walk iterateCandidates O(C) on large charts.
    const panelId = model.scene.panels[hit.panelIndex]?.id;
    return matchCandidateFromHit(model.candidates, hit, undefined, panelId);
  }

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
      candidate ??
      candidateFromHit(hit) ??
      model.candidates.nearest(hit.x, hit.y, { mode: "exact", maxDistance: 0 });
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
        // Preserve both dispatches (before emit/release and after) — do not
        // dedupe; may be load-bearing for reducer revision counting.
        deps.reducer().dispatch({ type: "inspect", candidate: null, source });
        if (action.emitClear) emitInspection({ type: "inspect", phase: "clear", source });
        inspection = null;
        inspectionSeed = null;
        inspectionCoordinator.release("transient");
        deps.reducer().dispatch({ type: "inspect", candidate: null, source });
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
        const next = resolved.snapshot;
        const candidateRef = buildInspectionCandidateRef({
          epoch: deps.model()?.runId ?? 0,
          candidateId: candidate?.id,
          fallbackId: () => traversalHits.indexOf(hit!),
          panelId: next.panelId,
          x: hit!.x,
          y: hit!.y,
        });
        deps.reducer().dispatch({ type: "inspect", candidate: candidateRef, source });
        if (state === "pinned") deps.reducer().dispatch({ type: "toggle-pin", source });
        if (
          !shouldCommitInspection({
            requestedState: state,
            reducerKind: deps.reducer().state.inspection.kind,
          })
        )
          return;
        inspection = next;
        inspectionSeed = resolved.seed;
        if (resolved.semanticChanged) emitInspection(next, resolved.semanticFingerprint);
      }
    }
  }

  function toggleInspectionPin(source: InteractionSource): void {
    const pinAction = resolveToggleInspectionPinAction({
      hasInspection: inspection !== null,
      hasSeed: inspectionSeed !== null,
      currentState: inspection?.state ?? "transient",
      pending: pendingPinnedPointer,
    });
    if (pinAction.type === "ignore") return;
    // toggle-pin always runs before restore/flip side effects; if flip
    // resolve returns null the reducer stays toggled (no rollback).
    deps.reducer().dispatch({ type: "toggle-pin", source });
    switch (pinAction.type) {
      case "restore-pending": {
        // Pure gate carries pending payload — no host non-null assert.
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
        // inspection + seed non-null after non-ignore (pure gate).
        const state = pinAction.state;
        const resolved = resolveInspection(
          hitFromCandidate(inspectionSeed!),
          source,
          state,
          inspection!.mode,
          inspectionSeed!,
        );
        if (resolved === null) return;
        inspection = resolved.snapshot;
        inspectionSeed = resolved.seed;
        if (state === "transient")
          deps.reducer().dispatch({
            type: "inspect",
            candidate: {
              epoch: deps.model()?.runId ?? 0,
              id: inspectionSeed.id,
              panelId: resolved.snapshot.panelId,
              x: inspectionSeed.x,
              y: inspectionSeed.y,
            },
            source,
          });
        if (state === "transient") inspectionCoordinator.release("pinned");
        if (shouldAnnounceUnpin({ state, source }))
          deps.announce(`${inspectionLiveText(resolved.snapshot)}, unpinned`);
        if (resolved.semanticChanged)
          emitInspection(resolved.snapshot, resolved.semanticFingerprint);
        if (
          shouldFocusPinnedInteractiveTooltip({
            state,
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
   * Pure plan owns escape-vs-close differences; host owns dispatch/emit/DOM.
   */
  function dismissInspection(
    kind: "escape" | "close",
    source: InteractionSource,
    opts: { restoreFocus?: boolean; returnToInspect?: boolean } = {},
  ): void {
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
    deps.reducer().dispatch({ type: "escape", source });
    if (plan.emitClear) emitInspection({ type: "inspect", phase: "clear", source });
    inspection = null;
    inspectionSeed = null;
    if (plan.clearTooltipHovered) deps.clearTooltipHovered();
    if (plan.clearPendingPinned) pendingPinnedPointer = null;
    if (plan.coordinator === "invalidate") inspectionCoordinator.invalidate();
    else inspectionCoordinator.release("pinned");
    if (plan.clearBrush) deps.clearBrush();
    if (plan.restoreFocus) queueMicrotask(() => deps.captureSurface()?.focus());
    if (plan.returnToInspect) deps.chooseTool("inspect");
  }

  function closeInspection(source: InteractionSource, restoreFocus = true): void {
    dismissInspection("close", source, { restoreFocus });
  }

  /** Private — no remaining external consumer (codex r2 P2-3). */
  function applyTraversalIndex(index: number): void {
    activeTraversalIndex = index;
    // O(1) id → facts for the selected index only (not full-store rematch).
    const model = deps.model();
    const id = traversal.candidateIds[index];
    const candidate =
      model === null || id === undefined
        ? undefined
        : (model.candidates.candidate(id) ?? undefined);
    setInspection(traversal.hits[index]!, "keyboard", "transient", undefined, candidate);
  }

  function navigate(delta: number): void {
    if (traversalHits.length === 0) return;
    applyTraversalIndex(nextTraversalIndex(activeTraversalIndex, delta, traversalHits.length));
  }

  function navigateDirection(dx: number, dy: number): void {
    const plan = planDirectionalNavigate({
      hitCount: traversalHits.length,
      hasInspection: inspection !== null,
      currentIndex: activeTraversalIndex,
      bestIndex: () => bestDirectionalIndex(inspection!.focus.anchor, traversalHits, dx, dy),
    });
    if (plan.type === "set-index") applyTraversalIndex(plan.index);
  }

  function cycleCoincident(delta: number): void {
    const plan = planCycleCoincident({
      hasInspection: inspection !== null,
      hitCount: traversalHits.length,
      currentIndex: activeTraversalIndex,
      nextIndex: () =>
        cycleCoincidentIndex(inspection!.focus.anchor, traversalHits, activeTraversalIndex, delta),
    });
    if (plan.type === "set-index") applyTraversalIndex(plan.index);
  }

  function resetTraversalIndex(): void {
    activeTraversalIndex = -1;
  }

  function applyQueuedInspectFrame(action: InspectPointerFrameAction): void {
    // Snapshot then clear queues before pure routing (matches prior host).
    const pending = queuedPointerInspection;
    const token = queuedPointerToken;
    queuedPointerInspection = null;
    queuedPointerToken = null;
    // Short-circuit tokenAccepted when no pending so accepts() is not
    // called for empty frames (Codex plan review).
    const frameAction = resolveQueuedInspectFrameAction({
      hasPending: pending !== null,
      tokenAccepted: pending === null || token === null || deps.reducer().accepts(token),
      currentState: inspection === null ? "none" : inspection.state,
      candidateEpochMismatch:
        action.candidate !== null && action.candidate.epoch !== deps.model()?.runId,
    });
    switch (frameAction.type) {
      case "none":
      case "drop":
        return;
      case "stash-pending":
        if (pending === null) return;
        pendingPinnedPointer = pending;
        return;
      case "apply-pending":
        if (pending === null) return;
        setInspection(
          pending.hit,
          pending.source,
          "transient",
          pending.concreteMode,
          pending.candidate,
        );
        break;
    }
  }

  function queuePointerFrame(queued: QueuedPointerInspection, token: InteractionFrameToken): void {
    queuedPointerInspection = queued;
    queuedPointerToken = token;
  }

  function clearQueuedPointer(): void {
    // Only the payload — token is NOT cleared (every host clear site).
    queuedPointerInspection = null;
  }

  function clearPendingPinned(): void {
    pendingPinnedPointer = null;
  }

  function registerInspectionEffects(): void {
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
          deps.reducer().dispatch({
            type: "inspect",
            candidate: null,
            source: "programmatic",
          });
          return;
        case "invalidate-clear-transient":
        case "invalidate-idle":
        case "invalidate-reconcile-pinned": {
          // currentModel is non-null for invalidate-* (plan requires run advance).
          const runId = currentModel!.runId;
          deps.reducer().dispatch({ type: "invalidate", reason: "scene" });
          queuedPointerInspection = null;
          pendingPinnedPointer = null;
          queuedPointerToken = null;
          deps.reducer().cancelScheduledPointer();
          reconciledRun = runId;
          if (plan.type === "invalidate-clear-transient") {
            inspectionCoordinator.release("transient");
            inspection = null;
            inspectionSeed = null;
            deps.reducer().dispatch({
              type: "inspect",
              candidate: null,
              source: "programmatic",
            });
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
            deps.reducer().dispatch({ type: "escape", source: "programmatic" });
            deps.reducer().dispatch({ type: "set-active", candidate: null });
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
            if (reconciled.semanticChanged)
              emitInspection(reconciled.snapshot, reconciled.semanticFingerprint);
          }
          break;
        }
      }
    });
  }

  return {
    get inspection() {
      return inspection;
    },
    get inspectionPanel() {
      return inspectionPanel;
    },
    setInspection,
    toggleInspectionPin,
    dismissInspection,
    closeInspection,
    navigate,
    navigateDirection,
    cycleCoincident,
    resetTraversalIndex,
    applyQueuedInspectFrame,
    queuePointerFrame,
    clearQueuedPointer,
    clearPendingPinned,
    registerInspectionEffects,
  };
}
