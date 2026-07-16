/**
 * Resolve one identity-indexed candidate datum from scene/frame/index context.
 */
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";

import {
  resolveAnnotationIntercepts,
  resolveOutlierContext,
} from "./build-candidates-datum-context.js";
import {
  makeSourceValueLookup,
  resolveCandidateFieldChannels,
} from "./build-candidates-datum-fields.js";
import {
  resolveCandidateSeries,
  resolveRepresentedSourceRows,
} from "./build-candidates-datum-series.js";
import { resolveCandidateLogicalValues } from "./build-candidates-datum-values.js";
import { resolveCandidateFrameRow } from "./build-candidates-frame-row.js";
import type { CandidateIdentityIndex } from "./build-candidates-identity.js";
import type { FacetPanelDef } from "./facets.js";
import { candidateAutoMode } from "./frame.js";
import type { MappedField } from "./types.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";

export interface IdentityCandidateResolveContext {
  scene: Scene;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly LayerFrame[])[];
  facetPanels: readonly FacetPanelDef[];
  table: ColumnTable;
  layerFields: readonly MappedField[][];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
  getIdentityIndex: () => CandidateIdentityIndex;
}

export function resolveIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): CandidateDatum {
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
  const { group, seriesRank } = resolveCandidateSeries({
    sourceRow,
    derivedGroup,
    seriesByRow,
    panelIndex: facts.panelIndex,
    layerIndex: facts.layerIndex,
    color: ctx.color,
    fill: ctx.fill,
    colorField,
    fillField,
    sourceValue,
  });
  const autoMode = candidateAutoMode(
    frame?.binding ?? ctx.bindings[facts.layerIndex]!,
    facts.primitiveIndex,
  );
  const { annotationRule, annotationX, annotationY } = resolveAnnotationIntercepts({
    frame,
    primitiveIndex: facts.primitiveIndex,
  });
  const { sourceOrder, lineageKey } = resolveRepresentedSourceRows({
    outlierSourceRow,
    sourceRow,
    group,
    panelIndex: facts.panelIndex,
    layerIndex: facts.layerIndex,
    sourceRowsByGroup,
    frame,
    table: ctx.table,
    frameRow,
    lineage: ctx.lineage,
    primitiveIndex: facts.primitiveIndex,
  });
  const { xValue, yValue } = resolveCandidateLogicalValues({
    annotationRule,
    annotationX,
    annotationY,
    outlierSourceRow,
    sourceRow,
    frame,
    frameRow,
    primitiveIndex: facts.primitiveIndex,
    sourceValue,
    xField,
    yField,
  });
  return {
    xValue,
    yValue,
    seriesId: group,
    seriesRank,
    sourceOrder,
    lineage: lineageKey,
    autoMode,
  };
}
