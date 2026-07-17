/**
 * Locate frame/batch context for one identity-indexed candidate fact.
 */
import type { CandidateBuildFacts } from "../candidate-store.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { resolveOutlierContext } from "./build-candidates-datum-context.js";
import {
  makeSourceValueLookup,
  resolveCandidateFieldChannels,
} from "./build-candidates-datum-fields.js";
import type { LocatedIdentityCandidate } from "./build-candidates-datum-locate-types.js";
import { resolveCandidateFrameRow } from "./build-candidates-frame-row.js";

export type { LocatedIdentityCandidate } from "./build-candidates-datum-locate-types.js";

export function locateIdentityCandidate(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): LocatedIdentityCandidate {
  const { seriesByRow, sourceRowsByGroup, sourceRowsByGroupX, sourceRowsByGroupBin, frameGroups } =
    ctx.getIdentityIndex();
  const fields = ctx.layerFields[facts.layerIndex] ?? [];
  const sourceRow = facts.rowIndex;
  const frame = ctx.panelFrames[facts.panelIndex]?.[facts.layerIndex];
  const batch = ctx.scene.batches[facts.batchIndex]!;
  const { outlierLocalRow, outlierSourceRow } = resolveOutlierContext({
    frame,
    batch,
    primitiveIndex: facts.primitiveIndex,
    facetPanel: ctx.facetPanels[facts.panelIndex],
  });
  const orderedGroups = frameGroups.get(`${facts.panelIndex}:${facts.layerIndex}`) ?? [0];
  const { frameRow, derivedGroup } = resolveCandidateFrameRow({
    frame,
    batch,
    primitiveIndex: facts.primitiveIndex,
    orderedGroups,
    outlierLocalRow,
  });
  const sourceValue = makeSourceValueLookup(ctx.table, sourceRow);
  const { xField, yField, colorField, fillField } = resolveCandidateFieldChannels(fields);
  return {
    sourceRow,
    frame,
    outlierSourceRow,
    frameRow,
    derivedGroup,
    sourceValue,
    xField,
    yField,
    colorField,
    fillField,
    seriesByRow,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
  };
}
