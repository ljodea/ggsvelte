/**
 * Interval-selection + bounds-editor controller extracted from GGPlot for S5.
 *
 * Owns the five $state fields (committedInterval, committedIntervalRecord,
 * localCommittedIntervals, boundsEditor, boundsReturnFocus), construction-time
 * deriveds (effectiveIntervals, effectiveIntervalKeys, currentInterval* family,
 * boundsEditorInput), both effects (interval-reconcile + bounds-cancel), private
 * helpers, and the public clear/commit/bounds methods.
 *
 * Construction-time deriveds may legitimately read model / effectiveZoomDomains
 * (factory sits after the runtime). Armed later-declared / handler-only deps
 * for the construction guard: emitSelection, commitZoom, announce,
 * inspectionPanel, candidateSemanticKeys.
 *
 * The host constructs semantic-key resolution before this factory
 * (construction-order convention; deriveds are lazy at the 5.33.1 floor, so
 * interval projection evaluates on first read, not at construction).
 * Semantic diagnostics retain their later effect-registration position
 * through the service's phased `registerEffects()` API (#165).
 */
import {
  decodeKey,
  encodeKey,
  type CandidateFacts,
  type CellValue,
  type RenderModel,
  type ScenePanel,
} from "@ggsvelte/core";

import type { PlotInteractionController } from "../interaction/controller.svelte.js";
import type {
  InteractionSource,
  IntervalSelection,
  PlotInteractionInterval,
  PlotInteractionScope,
  PlotSelection,
  ReadonlyIntervalDomains,
  ResolvedInteractionConfig,
  SemanticIntervalAxis,
} from "../interaction/interaction.js";
import type { BoundsEditorInput, PreciseBoundsApplyEvent } from "./bounds-editor.js";
import { frozenZoomDomains, type ContinuousZoomDomains } from "../scene/geometry.js";
import {
  buildIntervalSelection,
  clearIntervalSelectionEvent,
  persistentSelectionOrNull,
  type IntervalDomain,
} from "./interval.js";
import {
  consumeIntervalKeys,
  nextLocalIntervalRecords,
  prepareCandidateInInterval,
  sameIntervalRecord,
  type IntervalConsumptionCandidate,
} from "./consumption.js";
import { bandDomainValuesFromKeys, intervalPixelsFromDomains } from "./query.js";
import { boundsEditorInputForScale, semanticAxisFromBounds } from "./precise-bounds.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type IntervalStateDeps = {
  model: () => RenderModel | null;
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  resolvedInteractionScope: () => PlotInteractionScope;
  /** Narrow getter over `interactionConfig.select`. */
  selectConfig: () => ResolvedInteractionConfig["select"];
  /** Host alias over the S4 zoom controller (construction-safe). */
  effectiveZoomDomains: () => ContinuousZoomDomains | null;
  /** S4 controller write path for the bounds-editor zoom branch (stable fn). */
  commitZoom: (domains: ContinuousZoomDomains | null, source: InteractionSource) => void;
  coordFlipped: () => boolean;
  captureSurface: () => HTMLDivElement | null;
  /** Used by the precise-bounds lineage projection. */
  candidateSemanticKeys: (candidate: CandidateFacts) => PropertyKey[];
  /**
   * Deferred semantic Candidate view for non-union interval consumption.
   * Projection ownership stays outside interval behavior.
   */
  consumptionCandidates: () => readonly IntervalConsumptionCandidate<PropertyKey>[];
  /**
   * Handler-only: `openBoundsEditor` select branch reads the host's inspection
   * panel as its fallback target. Host derived is earlier than the factory and
   * returns `ScenePanel | null`.
   */
  inspectionPanel: () => ScenePanel | null;
  /** Hoisted host fn (shared with point selection until S7/S8). */
  emitSelection: (event: PlotSelection) => void;
  announce: (message: string) => void;
};

export type IntervalState = {
  readonly committedInterval: IntervalSelection | null;
  readonly effectiveIntervals: readonly PlotInteractionInterval<PropertyKey>[];
  readonly effectiveIntervalKeys: readonly PropertyKey[];
  readonly currentIntervalTargetLabel: string | undefined;
  readonly boundsEditorInput: BoundsEditorInput | null;
  readonly boundsReturnFocus: HTMLElement | null;
  /**
   * Narrow boolean for ToolRail `canSetIntervalBounds` — equivalent to
   * `currentIntervalRecord === null || currentIntervalPanel !== undefined`.
   * Does NOT expose the private record/panel deriveds.
   */
  readonly intervalBoundsTargetAvailable: boolean;
  clearIntervalSelection(source: InteractionSource): void;
  clearCurrentPanelInterval(source: InteractionSource): void;
  /**
   * Owns BOTH writes of the host's select-end branch (committedInterval +
   * conditional private commit). Snapshots `selectConfig()?.persistent` once.
   * Never calls emitSelection — host emits after this returns.
   */
  applyBrushSelectEnd(eventValue: IntervalSelection, source: InteractionSource): void;
  openBoundsEditor(action: "select" | "zoom", axis: "x" | "y", trigger: HTMLElement): void;
  applyPreciseBounds(event: PreciseBoundsApplyEvent): void;
  cancelBoundsEditor(): void;
};

// ---------------------------------------------------------------------------
// Module helpers (pure — no factory capture)
// ---------------------------------------------------------------------------

function facetIdentityValueLabel(encodedValue: string): string {
  const value = decodeKey(encodedValue);
  const kind =
    value instanceof Date
      ? "date"
      : value === null
        ? "null"
        : typeof value === "string"
          ? "text"
          : typeof value;
  const display = value instanceof Date ? value.toISOString() : String(value);
  return `${kind} ${display}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the interval-selection controller. Both effects register at
 * construction (original host positions relative to the runtime model effects
 * and the later semantic-key diagnostics effects).
 */
export function createIntervalState(deps: IntervalStateDeps): IntervalState {
  let committedInterval = $state<IntervalSelection | null>(null);
  // Semantic snapshot of the record backing `committedInterval`, so external
  // same-panel replacements are detected by content, not just presence.
  let committedIntervalRecord = $state<PlotInteractionInterval<PropertyKey> | null>(null);
  let localCommittedIntervals = $state<PlotInteractionInterval<PropertyKey>[]>([]);
  let boundsEditor = $state<{
    action: "select" | "zoom";
    axis: "x" | "y";
    panelId?: string;
    panelLabel?: string;
  } | null>(null);
  let boundsReturnFocus = $state<HTMLElement | null>(null);

  const effectiveIntervals = $derived.by(() => {
    // Equivalent dependency to the host `controllerRevision` derived —
    // read interaction revision directly (no extra dep).
    void (deps.interaction()?.revision ?? 0);
    return (
      deps.interaction()?.intervals(deps.resolvedInteractionScope()) ?? localCommittedIntervals
    );
  });

  const effectiveIntervalKeys: readonly PropertyKey[] = $derived.by(() => {
    const model = deps.model();
    if (model === null || effectiveIntervals.length === 0) return [];
    // Union consumes only stored record keys, and this derived re-runs on
    // every controller revision — skip the O(candidates) semantic projection
    // whenever the preset never reads it.
    const preset = effectiveIntervals[0]?.preset;
    if (preset === "union")
      return consumeIntervalKeys({
        records: effectiveIntervals,
        panels: model.scene.panels,
        candidates: [],
      });
    return consumeIntervalKeys({
      records: effectiveIntervals,
      panels: model.scene.panels,
      candidates: deps.consumptionCandidates(),
    });
  });

  const currentIntervalRecord = $derived.by(() => {
    const intervalPanelId = committedInterval?.panelId;
    return (
      (intervalPanelId === null || intervalPanelId === undefined
        ? undefined
        : effectiveIntervals.find((record) => record.panelId === intervalPanelId)) ??
      effectiveIntervals[0] ??
      null
    );
  });

  const currentIntervalPanel = $derived.by((): ScenePanel | undefined => {
    const model = deps.model();
    if (currentIntervalRecord === null || model === null) {
      // Explicit undefined keeps consistent-return happy on the .ts surface
      // (host .svelte used bare `return`; type-aware lint only runs on .ts).
      return undefined;
    }
    return model.scene.panels.find((candidate) => candidate.id === currentIntervalRecord.panelId);
  });

  // A shared controller can clear or replace this chart's interval from
  // outside (a linked plot, programmatic reconcile). The local pixel
  // rectangle must not outlive its semantic record — including a same-panel
  // record whose domains or keys were replaced under it.
  $effect(() => {
    const current = committedInterval;
    if (current === null) return;
    const record = effectiveIntervals.find((candidate) => candidate.panelId === current.panelId);
    if (
      record !== undefined &&
      (committedIntervalRecord === null || sameIntervalRecord(committedIntervalRecord, record))
    )
      return;
    committedInterval = null;
    committedIntervalRecord = null;
  });

  function intervalPanelLabel(panel: ScenePanel): string {
    const display = panel.strip.trim() || "panel";
    const model = deps.model();
    if (
      model === null ||
      model.scene.panels.filter((candidate) => candidate.strip.trim() === panel.strip.trim())
        .length < 2
    )
      return display;
    const identity = panel.identity.values
      .map((value) => `${value.field}: ${facetIdentityValueLabel(value.encodedValue)}`)
      .join(", ");
    return identity.length > 0 ? `${display} (${identity})` : display;
  }

  const currentIntervalTargetLabel = $derived.by((): string | undefined => {
    if (currentIntervalRecord === null || deps.model() === null) {
      return undefined;
    }
    if (currentIntervalPanel === undefined) return "unavailable panel";
    if (
      currentIntervalPanel.strip.trim().length === 0 &&
      currentIntervalPanel.identity.values.length === 0
    ) {
      return undefined;
    }
    return intervalPanelLabel(currentIntervalPanel);
  });

  const boundsEditorInput = $derived.by((): BoundsEditorInput | null => {
    if (boundsEditor === null || deps.model() === null) return null;
    const model = deps.model()!;
    if (boundsEditor.action === "zoom") {
      const scale = model.scales[boundsEditor.axis];
      if (scale.type === "band") return null;
      const bounds = deps.effectiveZoomDomains()?.[boundsEditor.axis] ?? scale.domain;
      return boundsEditorInputForScale({
        axis: boundsEditor.axis,
        action: "zoom",
        scale,
        bounds,
        reversed: scale.normalize(scale.domain[0]) > scale.normalize(scale.domain[1]),
      });
    }
    const record = currentIntervalRecord;
    const targetPanelId = record?.panelId ?? boundsEditor.panelId;
    if (targetPanelId === undefined) return null;
    const panelIndex = model.scene.panels.findIndex((panel) => panel.id === targetPanelId);
    if (panelIndex < 0) return null;
    const scale =
      model.scales.panels[panelIndex]?.[boundsEditor.axis] ?? model.scales[boundsEditor.axis];
    const semantic = record?.domains[boundsEditor.axis];
    const bounds =
      semantic?.kind === "band"
        ? ([semantic.values[0] ?? "", semantic.values.at(-1) ?? ""] as const)
        : semantic?.domain;
    return boundsEditorInputForScale({
      axis: boundsEditor.axis,
      action: "select",
      scale,
      ...(bounds !== undefined && { bounds }),
      reversed:
        scale.type !== "band" &&
        scale.normalize(scale.domain[0]) > scale.normalize(scale.domain[1]),
    });
  });

  $effect(() => {
    if (boundsEditor === null || boundsEditorInput !== null) return;
    const target = boundsEditor.panelLabel ?? "the target panel";
    boundsEditor = null;
    boundsReturnFocus = null;
    // The original button may have been reused for a different panel. The
    // capture surface is the stable recovery target for reactive cancellation;
    // explicit Apply/Cancel still restores the initiating button.
    queueMicrotask(() => {
      deps.captureSurface()?.focus();
      deps.announce(`Bounds editing cancelled because ${target} is no longer available.`);
    });
  });

  const intervalBoundsTargetAvailable = $derived(
    currentIntervalRecord === null || currentIntervalPanel !== undefined,
  );

  function clearIntervalSelection(source: InteractionSource): void {
    const current = committedInterval;
    if (current === null && effectiveIntervals.length === 0) return;
    if (deps.interaction() === undefined) {
      localCommittedIntervals = [];
    } else {
      deps.interaction()!.clearIntervals({
        scope: deps.resolvedInteractionScope(),
        source,
      });
    }
    const event = clearIntervalSelectionEvent(
      current ?? {
        mode: deps.selectConfig()?.mode ?? "xy",
        panelId: null,
        pixels: { x0: 0, y0: 0, x1: 0, y1: 0 },
      },
      source,
    );
    committedInterval = null;
    committedIntervalRecord = null;
    deps.emitSelection(event);
  }

  function clearCurrentPanelInterval(source: InteractionSource): void {
    const intervalPanelId = committedInterval?.panelId ?? currentIntervalRecord?.panelId;
    if (intervalPanelId === null || intervalPanelId === undefined) return;
    if (deps.interaction() === undefined) {
      localCommittedIntervals = localCommittedIntervals.filter(
        (interval) => interval.panelId !== intervalPanelId,
      );
    } else {
      deps.interaction()!.clearInterval(intervalPanelId, {
        scope: deps.resolvedInteractionScope(),
        source,
      });
    }
    const event = clearIntervalSelectionEvent(
      committedInterval ?? {
        mode: deps.selectConfig()?.mode ?? "xy",
        panelId: intervalPanelId,
        pixels: { x0: 0, y0: 0, x1: 0, y1: 0 },
      },
      source,
    );
    committedInterval = null;
    committedIntervalRecord = null;
    deps.emitSelection(event);
  }

  function semanticAxis(
    panelIndex: number,
    axis: "x" | "y",
    bounds: readonly [unknown, unknown] | undefined,
  ): SemanticIntervalAxis | undefined {
    if (bounds === undefined || deps.model() === null) return undefined;
    const model = deps.model()!;
    const scale = model.scales.panels[panelIndex]?.[axis] ?? model.scales[axis];
    if (scale.type === "band") {
      const first = scale.indexOf(bounds[0]);
      const last = scale.indexOf(bounds[1]);
      if (first === undefined || last === undefined) return undefined;
      const lower = Math.min(first, last);
      const upper = Math.max(first, last);
      return Object.freeze({
        kind: "band",
        values: Object.freeze(
          scale.rawDomain.slice(lower, upper + 1).map((value) => encodeKey(value)),
        ),
      });
    }
    return semanticAxisFromBounds(scale.type, [Number(bounds[0]), Number(bounds[1])]);
  }

  function eventAxisBounds(
    panelIndex: number,
    axis: "x" | "y",
    semantic: SemanticIntervalAxis | undefined,
  ): readonly [CellValue, CellValue] | undefined {
    if (semantic === undefined || deps.model() === null) return undefined;
    if (semantic.kind !== "band") return semantic.domain;
    const model = deps.model()!;
    const scale = model.scales.panels[panelIndex]?.[axis] ?? model.scales[axis];
    if (scale.type !== "band" || semantic.values.length === 0) return undefined;
    const values = bandDomainValuesFromKeys(scale.rawDomain, semantic.values);
    return values.length === 0 ? undefined : [values[0]!, values.at(-1)!];
  }

  function eventDomain(panelIndex: number, domains: ReadonlyIntervalDomains): IntervalDomain {
    const x = eventAxisBounds(panelIndex, "x", domains.x);
    const y = eventAxisBounds(panelIndex, "y", domains.y);
    return {
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
    };
  }

  /**
   * One full-store pass for precise-bounds apply: semantic keys + lineage row
   * count for the target panel/domains. Was two walks (consumption bag then
   * intervalLineageCount) with intermediate rowIndexesForCandidate arrays.
   */
  function recomputePanelIntervalSelection(
    targetPanelId: string,
    domains: ReadonlyIntervalDomains,
  ): { readonly keys: readonly PropertyKey[]; readonly lineageCount: number } {
    const model = deps.model();
    if (model === null) return { keys: Object.freeze([]), lineageCount: 0 };
    const inInterval = prepareCandidateInInterval(domains);
    const keys = new Set<PropertyKey>();
    const rows = new Set<number>();
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null || candidate.panelId !== targetPanelId || !inInterval(candidate))
        continue;
      for (const key of deps.candidateSemanticKeys(candidate)) keys.add(key);
      for (const rowIndex of model.lineage.keys(candidate.lineage)) rows.add(rowIndex);
      if (candidate.rowIndex !== null) rows.add(candidate.rowIndex);
    }
    return { keys: Object.freeze([...keys]), lineageCount: rows.size };
  }

  /** Private — no remaining external consumer (codex P2-7). */
  function commitIntervalSelection(event: IntervalSelection, source: InteractionSource): void {
    const targetPanelId = event.panelId;
    if (targetPanelId === null || deps.model() === null) return;
    const model = deps.model()!;
    const panelIndex = model.scene.panels.findIndex((panel) => panel.id === targetPanelId);
    if (panelIndex < 0) return;
    const x = semanticAxis(panelIndex, "x", event.domain.x);
    const y = semanticAxis(panelIndex, "y", event.domain.y);
    // An empty facet panel trains no band domain, so no semantic axis
    // survives the selection mode. The controller rejects axis-less
    // intervals (TypeError) — treat the brush as an empty selection.
    if (x === undefined && y === undefined) return;
    const record: PlotInteractionInterval<PropertyKey> = Object.freeze({
      panelId: targetPanelId,
      preset: deps.selectConfig()?.preset ?? "independent",
      domains: Object.freeze({
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      }),
      keys: Object.freeze([...event.keys]),
    });
    committedIntervalRecord = record;
    if (deps.interaction() === undefined) {
      localCommittedIntervals = [...nextLocalIntervalRecords(localCommittedIntervals, record)];
    } else {
      deps.interaction()!.setInterval(record, {
        scope: deps.resolvedInteractionScope(),
        source,
      });
    }
  }

  function applyBrushSelectEnd(eventValue: IntervalSelection, source: InteractionSource): void {
    // Snapshot once (drift-safe under reactive selectConfig replacement).
    const persistent = deps.selectConfig()?.persistent;
    committedInterval = persistentSelectionOrNull(persistent, eventValue);
    // TRUTHY guard, exactly as the host's select-end branch — untyped JS
    // consumers may pass truthy non-boolean `persistent` values, which the
    // config normalizer forwards unchanged. `?? false` only maps nullish
    // (already falsy) values, so runtime truthiness is identical.
    if (persistent ?? false) commitIntervalSelection(eventValue, source);
  }

  function openBoundsEditor(
    action: "select" | "zoom",
    axis: "x" | "y",
    trigger: HTMLElement,
  ): void {
    boundsReturnFocus = trigger;
    if (action === "select") {
      const panel =
        currentIntervalRecord === null
          ? (deps.inspectionPanel() ?? deps.model()?.scene.panels[0])
          : currentIntervalPanel;
      if (panel === undefined) return;
      boundsEditor = {
        action,
        axis,
        panelId: panel.id,
        panelLabel: intervalPanelLabel(panel),
      };
      return;
    }
    boundsEditor = { action, axis };
  }

  function applyPreciseBounds(event: PreciseBoundsApplyEvent): void {
    if (event.action === "zoom") {
      if (event.scale === "band") return;
      deps.commitZoom(
        frozenZoomDomains({
          ...deps.effectiveZoomDomains(),
          [event.axis]: [...event.bounds],
        }),
        event.inputSource,
      );
      boundsEditor = null;
      return;
    }
    const prior = currentIntervalRecord;
    const targetPanelId = prior?.panelId ?? boundsEditor?.panelId;
    if (targetPanelId === null || targetPanelId === undefined || deps.model() === null) return;
    const model = deps.model()!;
    const panelIndex = model.scene.panels.findIndex((candidate) => candidate.id === targetPanelId);
    if (panelIndex < 0) return;
    const axis = semanticAxis(panelIndex, event.axis, event.bounds);
    if (axis === undefined) return;
    const domains = Object.freeze({
      ...prior?.domains,
      [event.axis]: axis,
    });
    // Keys + lineageCount from one candidate-store pass (not consumption then
    // a second lineage scan).
    const { keys, lineageCount } = recomputePanelIntervalSelection(targetPanelId, domains);
    const next: PlotInteractionInterval<PropertyKey> = Object.freeze({
      panelId: targetPanelId,
      preset: prior?.preset ?? deps.selectConfig()?.preset ?? "independent",
      domains,
      keys,
    });
    // Precise bounds persist exactly like the brush path: with
    // `persistent: false` the end event still fires, but no durable record,
    // committed rectangle, or clear-selection controls appear.
    const persistent = deps.selectConfig()?.persistent === true;
    if (persistent) {
      committedIntervalRecord = next;
      if (deps.interaction() === undefined) {
        localCommittedIntervals = [...nextLocalIntervalRecords(localCommittedIntervals, next)];
      } else {
        deps.interaction()!.setInterval(next, {
          scope: deps.resolvedInteractionScope(),
          source: event.inputSource,
        });
      }
    }
    const panel = model.scene.panels[panelIndex]!;
    const eventValue = buildIntervalSelection({
      phase: "end",
      mode: deps.selectConfig()?.mode ?? "xy",
      panelId: targetPanelId,
      domain: eventDomain(panelIndex, domains),
      // The overlay must depict the interval that was actually applied, so
      // project the edited domains back into pixels rather than reusing the
      // pre-edit rectangle (or defaulting to the whole panel).
      pixels: intervalPixelsFromDomains({
        domains,
        panel,
        scales: model.scales.panels[panelIndex] ?? model.scales,
        flipped: deps.coordFlipped(),
      }),
      keys,
      lineageCount,
      source: event.inputSource,
    });
    committedInterval = persistentSelectionOrNull(deps.selectConfig()?.persistent, eventValue);
    deps.emitSelection(eventValue);
    boundsEditor = null;
  }

  function cancelBoundsEditor(): void {
    boundsEditor = null;
  }

  return {
    get committedInterval() {
      return committedInterval;
    },
    get effectiveIntervals() {
      return effectiveIntervals;
    },
    get effectiveIntervalKeys() {
      return effectiveIntervalKeys;
    },
    get currentIntervalTargetLabel() {
      return currentIntervalTargetLabel;
    },
    get boundsEditorInput() {
      return boundsEditorInput;
    },
    get boundsReturnFocus() {
      return boundsReturnFocus;
    },
    get intervalBoundsTargetAvailable() {
      return intervalBoundsTargetAvailable;
    },
    clearIntervalSelection,
    clearCurrentPanelInterval,
    applyBrushSelectEnd,
    openBoundsEditor,
    applyPreciseBounds,
    cancelBoundsEditor,
  };
}
