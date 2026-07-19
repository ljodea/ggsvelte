import {
  buildInteractionMasks,
  type BatchInteractionMask,
  type CandidateFacts,
  type RenderModel,
} from "@ggsvelte/core";

import type { PlotInteractionInterval } from "../interaction/interaction.js";
import type { IntervalConsumptionCandidate } from "../interval/consumption.js";
import {
  anchorsFromCandidateKeys,
  collectCandidates,
  mergePresentationFocusKeys,
  type PresentationInspectionFocus,
} from "../selection/selection.js";

type SemanticCandidate = IntervalConsumptionCandidate<PropertyKey> & {
  readonly x: number;
  readonly y: number;
  readonly batchIndex: number;
  readonly primitiveIndex: number;
};

export type SemanticCandidateProjectionDeps = {
  model: () => RenderModel | null;
  candidateSemanticKeys: (candidate: CandidateFacts) => readonly PropertyKey[];
  selectedKeys: () => readonly PropertyKey[];
  intervalKeys: () => readonly PropertyKey[];
  intervals: () => readonly PlotInteractionInterval<PropertyKey>[];
  emphasisKeys: () => readonly PropertyKey[];
  inspectionFocus: () => PresentationInspectionFocus | null;
};

export type SemanticCandidateProjection = {
  readonly selectedAnchors: { x: number; y: number }[];
  readonly emphasizedAnchors: { x: number; y: number }[];
  readonly interactionMasks: readonly (BatchInteractionMask | null)[];
  readonly intervalConsumptionCandidates: readonly IntervalConsumptionCandidate<PropertyKey>[];
};

/**
 * Own the one semantic walk over CandidateStore and all presentation shapes
 * derived from it. Counts gate the walk so key-only changes reuse projection.
 */
export function createSemanticCandidateProjection(
  deps: SemanticCandidateProjectionDeps,
): SemanticCandidateProjection {
  const presentationFocusKeys = $derived(
    mergePresentationFocusKeys(deps.emphasisKeys(), deps.inspectionFocus()),
  );
  const selectedKeyCount = $derived(deps.selectedKeys().length);
  const emphasisKeyCount = $derived(deps.emphasisKeys().length);
  const presentationFocusKeyCount = $derived(presentationFocusKeys.length);
  const needIntervalConsumptionWalk = $derived(
    deps.intervals().length > 0 && deps.intervals()[0]?.preset !== "union",
  );
  // Non-union interval keys consume this projection, so do not read them until
  // the non-union gate has been handled.
  const intervalKeyCount = $derived(deps.intervalKeys().length);

  const sharedCandidateProjection = $derived.by((): SemanticCandidate[] => {
    if (
      !needIntervalConsumptionWalk &&
      selectedKeyCount + intervalKeyCount + emphasisKeyCount + presentationFocusKeyCount === 0
    ) {
      return [];
    }
    const model = deps.model();
    if (model === null) return [];
    return collectCandidates(model.candidates, (candidate) => ({
      x: candidate.x,
      y: candidate.y,
      batchIndex: candidate.batchIndex,
      primitiveIndex: candidate.primitiveIndex,
      panelId: candidate.panelId,
      keys: deps.candidateSemanticKeys(candidate),
      ...(candidate.xValue !== undefined && { xValue: candidate.xValue }),
      ...(candidate.yValue !== undefined && { yValue: candidate.yValue }),
    }));
  });

  const intervalConsumptionCandidates = $derived.by(
    (): readonly IntervalConsumptionCandidate<PropertyKey>[] =>
      needIntervalConsumptionWalk ? sharedCandidateProjection : [],
  );
  const selectedAnchors = $derived(
    anchorsFromCandidateKeys(sharedCandidateProjection, [
      ...new Set([...deps.selectedKeys(), ...deps.intervalKeys()]),
    ]),
  );
  const emphasizedAnchors = $derived(
    anchorsFromCandidateKeys(sharedCandidateProjection, deps.emphasisKeys()),
  );
  const interactionMasks = $derived.by((): readonly (BatchInteractionMask | null)[] => {
    const model = deps.model();
    if (model === null || presentationFocusKeys.length === 0) return [];
    return buildInteractionMasks(
      model.scene.batches,
      presentationFocusKeys,
      sharedCandidateProjection,
    );
  });

  return {
    get selectedAnchors() {
      return selectedAnchors;
    },
    get emphasizedAnchors() {
      return emphasizedAnchors;
    },
    get interactionMasks() {
      return interactionMasks;
    },
    get intervalConsumptionCandidates() {
      return intervalConsumptionCandidates;
    },
  };
}
