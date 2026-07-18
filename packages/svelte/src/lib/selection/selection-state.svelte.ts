/**
 * Point-selection controller extracted from GGPlot for S8.
 *
 * Owns local selection state, the construction-time `effectiveSelectedKeys`
 * derived (inputs are all earlier-declared), commit/clear/toggle/emit
 * handlers, and the later-input anchor / presentation-mask methods.
 *
 * Construction topology (host): factory sits at the original localSelectedKeys
 * position (after surface, before legend-focus / interval). Construction-time
 * derived reads only earlier bindings (interaction, scope). Anchors and masks
 * are methods because they close over later-declared effectiveIntervalKeys,
 * effectiveEmphasisKeys, candidateSemanticKeys, and inspection focus.
 *
 * `commitPointSelection` is PRIVATE (no external caller — toggle/clear only).
 * Public API speaks PropertyKey; PublicKey casts stay at the host boundary.
 */
import type { BatchInteractionMask, CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import { buildInteractionMasks } from "@ggsvelte/core";

import type { PlotInteractionController } from "../interaction/controller.svelte.js";
import type {
  InteractionSource,
  PlotInteractionEvent,
  PlotInteractionScope,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { selectionAnnouncement } from "../assembly/labels.js";
import {
  anchorsFromCandidateKeys,
  buildPointSelectionEvent,
  collectCandidates,
  mergePresentationFocusKeys,
  nextPointSelectionKeys,
  sameOrderedPropertyKeys,
  type PresentationInspectionFocus,
} from "./selection.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SelectionStateDeps = {
  model: () => RenderModel | null;
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  resolvedInteractionScope: () => PlotInteractionScope;
  /** Narrow getter over `interactionConfig.select`. */
  selectConfig: () => ResolvedInteractionConfig["select"];
  /**
   * Deferred: host interval alias is declared after this factory. Method-only
   * (computeSelectedAnchors).
   */
  effectiveIntervalKeys: () => readonly PropertyKey[];
  /**
   * Deferred: host legend-focus alias is declared after this factory.
   * Method-only (computeEmphasizedAnchors / presentation focus).
   */
  effectiveEmphasisKeys: () => readonly PropertyKey[];
  /**
   * Deferred method-only projection of inspection focus for presentation
   * masks. Host may supply a Pick of the inspection derived.
   */
  inspectionFocus: () => PresentationInspectionFocus | null;
  /**
   * Deferred: host alias initializes after the semantic-key service (#165).
   * Method-only (anchors / candidate projections).
   */
  candidateSemanticKeys: (candidate: CandidateFacts) => PropertyKey[];
  /** Deferred callback getters (handler-only; never construction). */
  onselect: () => ((event: PlotSelection) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  /** Stable sink; announcer is declared later — handler-only. */
  announce: (message: string) => void;
};

/**
 * One candidate projection for anchors + interaction masks.
 * Built once per reactive need so selected/emphasized/mask paths do not each
 * re-walk the store (was O(2–3C) when several are live).
 */
type SharedCandidateProjection = {
  readonly x: number;
  readonly y: number;
  readonly batchIndex: number;
  readonly primitiveIndex: number;
  readonly keys: readonly PropertyKey[];
};

export type SelectionState = {
  readonly effectiveSelectedKeys: readonly PropertyKey[];
  clearPointSelection(source: InteractionSource): void;
  togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void;
  emitSelection(event: PlotSelection): void;
  /**
   * Full-store projection (x/y + mask fields + keys). Host should `$derived`
   * this once when any anchor or mask consumer is live, then pass the array
   * into the shared-projection overloads below.
   */
  computeSharedCandidateProjection(): SharedCandidateProjection[];
  computeSelectedAnchors(
    sharedProjection?: readonly SharedCandidateProjection[],
  ): { x: number; y: number }[];
  computeEmphasizedAnchors(
    sharedProjection?: readonly SharedCandidateProjection[],
  ): { x: number; y: number }[];
  computePresentationFocusKeys(): readonly PropertyKey[];
  /** Alias of computeSharedCandidateProjection (tests / masks). */
  computeSemanticCandidateProjections(): SharedCandidateProjection[];
  /**
   * Takes BOTH upstream values as parameters so the host's three separate
   * derived aliases preserve independent memo boundaries (focus-only changes
   * must not re-walk candidates).
   */
  computeInteractionMasks(
    presentationFocusKeys: readonly PropertyKey[],
    getSemanticCandidateProjections: () => readonly SharedCandidateProjection[],
  ): readonly (BatchInteractionMask | null)[];
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the point-selection controller. Construction registers only the
 * `effectiveSelectedKeys` derived (over earlier host bindings). Anchors and
 * masks are methods that may read later-declared deps via deferred getters.
 */
export function createSelectionState(deps: SelectionStateDeps): SelectionState {
  let localSelectedKeys = $state<PropertyKey[]>([]);

  const effectiveSelectedKeys: readonly PropertyKey[] = $derived.by(() => {
    // Equivalent dependency to the former host `controllerRevision` derived —
    // read interaction revision directly (S3–S5 pattern).
    void (deps.interaction()?.revision ?? 0);
    return deps.interaction()?.selected(deps.resolvedInteractionScope()) ?? localSelectedKeys;
  });

  function projectCandidates(): SharedCandidateProjection[] {
    const model = deps.model();
    if (model === null) return [];
    return collectCandidates(model.candidates, (candidate) => ({
      x: candidate.x,
      y: candidate.y,
      batchIndex: candidate.batchIndex,
      primitiveIndex: candidate.primitiveIndex,
      keys: deps.candidateSemanticKeys(candidate),
    }));
  }

  function anchorsForKeys(
    keys: readonly PropertyKey[],
    sharedProjection?: readonly SharedCandidateProjection[],
  ): { x: number; y: number }[] {
    // Empty filter short-circuits before walking (keysFor can be expensive).
    if (keys.length === 0) return [];
    if (deps.model() === null) return [];
    const candidates = sharedProjection ?? projectCandidates();
    return anchorsFromCandidateKeys(candidates, keys);
  }

  /** Private — only clear/toggle call this; no external caller (P2-7). */
  function commitPointSelection(keys: readonly PropertyKey[], source: InteractionSource): void {
    let committed: readonly PropertyKey[];
    const interaction = deps.interaction();
    if (interaction === undefined) {
      const next = [...new Set(keys)];
      if (sameOrderedPropertyKeys(next, localSelectedKeys)) return;
      localSelectedKeys = next;
      committed = localSelectedKeys;
    } else {
      const transition = interaction.setSelection(keys, {
        scope: deps.resolvedInteractionScope(),
        source,
      });
      if (transition === null) return;
      committed =
        transition.snapshot.selections.find(
          (selection) => selection.scope === deps.resolvedInteractionScope().keys,
        )?.keys ?? [];
    }
    emitSelection(buildPointSelectionEvent(committed, source));
  }

  function clearPointSelection(source: InteractionSource): void {
    if (effectiveSelectedKeys.length === 0) return;
    commitPointSelection([], source);
  }

  function emitSelection(event: PlotSelection): void {
    const message = selectionAnnouncement(event);
    if (message !== null) deps.announce(message);
    deps.onselect()?.(event);
    deps.oninteraction()?.(event);
  }

  function togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void {
    if (keys.length === 0) return;
    const next = nextPointSelectionKeys(
      effectiveSelectedKeys,
      keys,
      deps.selectConfig()?.multiple ?? false,
    );
    commitPointSelection(next, source);
  }

  function computeSharedCandidateProjection(): SharedCandidateProjection[] {
    return projectCandidates();
  }

  function computeSelectedAnchors(
    sharedProjection?: readonly SharedCandidateProjection[],
  ): { x: number; y: number }[] {
    return anchorsForKeys(
      [...new Set([...effectiveSelectedKeys, ...deps.effectiveIntervalKeys()])],
      sharedProjection,
    );
  }

  function computeEmphasizedAnchors(
    sharedProjection?: readonly SharedCandidateProjection[],
  ): { x: number; y: number }[] {
    return anchorsForKeys(deps.effectiveEmphasisKeys(), sharedProjection);
  }

  function computePresentationFocusKeys(): readonly PropertyKey[] {
    return mergePresentationFocusKeys(deps.effectiveEmphasisKeys(), deps.inspectionFocus());
  }

  function computeSemanticCandidateProjections(): SharedCandidateProjection[] {
    return projectCandidates();
  }

  function computeInteractionMasks(
    presentationFocusKeys: readonly PropertyKey[],
    // THUNK, not a value: the empty-focus guard below must short-circuit
    // BEFORE the projections derived is read, exactly as the base host did —
    // an eager parameter would run the O(candidates) semantic-key walk on
    // every model update (and every SSR render) in the idle no-focus state.
    getSemanticCandidateProjections: () => readonly SharedCandidateProjection[],
  ): readonly (BatchInteractionMask | null)[] {
    const model = deps.model();
    if (model === null || presentationFocusKeys.length === 0) return [];
    return buildInteractionMasks(
      model.scene.batches,
      presentationFocusKeys,
      getSemanticCandidateProjections(),
    );
  }

  return {
    get effectiveSelectedKeys() {
      return effectiveSelectedKeys;
    },
    clearPointSelection,
    togglePointKeys,
    emitSelection,
    computeSharedCandidateProjection,
    computeSelectedAnchors,
    computeEmphasizedAnchors,
    computePresentationFocusKeys,
    computeSemanticCandidateProjections,
    computeInteractionMasks,
  };
}
