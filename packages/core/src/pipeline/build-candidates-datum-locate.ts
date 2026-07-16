/**
 * Locate frame/batch context for one identity-indexed candidate fact.
 */
import type { CandidateBuildFacts } from "../candidate-store.js";
import type { CellValue } from "../table.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { resolveOutlierContext } from "./build-candidates-datum-context.js";
import {
  makeSourceValueLookup,
  resolveCandidateFieldChannels,
} from "./build-candidates-datum-fields.js";
import { resolveCandidateFrameRow } from "./build-candidates-frame-row.js";
import type { LayerFrame } from "./types.js";

export interface LocatedIdentityCandidate {
  sourceRow: number | null;
  frame: LayerFrame | undefined;
  outlierSourceRow: number | null;
  frameRow: number;
  derivedGroup: number;
  sourceValue: (field: string | undefined) => CellValue;
  xField: string | undefined;
  yField: string | undefined;
  colorField: string | undefined;
  fillField: string | undefined;
  seriesByRow: Map<string, number>;
  sourceRowsByGroup: Map<string, number[]>;
}

export function locateIdentityCandidate(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): LocatedIdentityCandidate {
  const { seriesByRow, sourceRowsByGroup, frameGroups } = ctx.getIdentityIndex();
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
  };
}
