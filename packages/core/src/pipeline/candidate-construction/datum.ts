/**
 * Identity candidate datum resolver — thin factory + attribute assembly.
 *
 * Locate: datum-locate.ts · Series: datum-series.ts · Values: datum-values.ts
 * Shared types: datum-types.ts · Represented-row filters: represented-rows.ts
 */
import type { CandidateBuildFacts, CandidateDatum } from "../../candidate-store.js";
import type { LineageStore } from "../../identity.js";
import type { Scene } from "../../scene.js";
import type { CellValue, ColumnTable } from "../../table.js";
import type { FacetPanelDef } from "../facets.js";
import type { LayerBinding, LayerFrame, MappedField, ResolvedColorScale } from "../types.js";
import { candidateAutoMode } from "../frame-candidates-auto-mode.js";
import { resolveCandidateLogicalValues } from "./datum-values.js";
import { locateIdentityCandidate } from "./datum-locate.js";
import { resolveIdentitySeriesAndMode } from "./datum-series.js";
import type { IdentityCandidateResolveContext, LocatedIdentityCandidate } from "./datum-types.js";
import type { CandidateIdentityIndex } from "./identity-index.js";
import { filterRepresentedSourceRows } from "./represented-rows.js";

// Public re-exports for characterization tests and external callers.
export { resolveOutlierContext } from "./datum-locate.js";
export { resolveCandidateSeries } from "./datum-series.js";

function resolveAnnotationIntercepts(input: {
  frame: LayerFrame | undefined;
  primitiveIndex: number;
}): {
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
} {
  const { frame, primitiveIndex } = input;
  if (frame?.binding.ruleForm !== "annotation") {
    return { annotationRule: false, annotationX: null, annotationY: null };
  }
  return {
    annotationRule: true,
    annotationX: frame.xIntercepts[primitiveIndex] ?? null,
    annotationY: frame.yIntercepts[primitiveIndex - frame.xIntercepts.length] ?? null,
  };
}

interface IdentityCandidateAttrs {
  group: number;
  seriesRank: number;
  autoMode: ReturnType<typeof candidateAutoMode>;
  sourceOrder: number;
  lineageKey: number;
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
}

export function resolveRepresentedSourceRows(input: {
  outlierSourceRow: number | null;
  sourceRow: number | null;
  group: number;
  panelIndex: number;
  layerIndex: number;
  sourceRowsByGroup: Map<string, number[]>;
  sourceRowsByGroupX?: Map<string, number[]>;
  sourceRowsByGroupBin?: Map<string, number[]>;
  sourceRowsByGroupY?: Map<string, number[]>;
  frame: LayerFrame | undefined;
  table: ColumnTable;
  frameRow: number;
  lineage: LineageStore<number>;
  primitiveIndex: number;
}): { representedRows: number[]; sourceOrder: number; lineageKey: number } {
  const {
    outlierSourceRow,
    sourceRow,
    group,
    panelIndex,
    layerIndex,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
    frame,
    table,
    frameRow,
    lineage,
    primitiveIndex,
  } = input;

  // Outliers already pin an exact source row — do not re-expand via aggregate
  // group×x / bin indexes (those buckets contain every row the box represents).
  let representedRows =
    outlierSourceRow === null
      ? (sourceRowsByGroup.get(`${panelIndex}:${layerIndex}:${group}`) ?? [])
      : [outlierSourceRow];
  if (sourceRow === null && outlierSourceRow === null && frame !== undefined) {
    const filterInput: Parameters<typeof filterRepresentedSourceRows>[0] = {
      frame,
      table,
      frameRow,
      baseRows: representedRows,
      group,
      panelIndex,
      layerIndex,
    };
    if (sourceRowsByGroupX) filterInput.sourceRowsByGroupX = sourceRowsByGroupX;
    if (sourceRowsByGroupBin) filterInput.sourceRowsByGroupBin = sourceRowsByGroupBin;
    if (sourceRowsByGroupY) filterInput.sourceRowsByGroupY = sourceRowsByGroupY;
    representedRows = filterRepresentedSourceRows(filterInput);
  }
  return {
    representedRows,
    sourceOrder: sourceRow ?? outlierSourceRow ?? primitiveIndex,
    lineageKey: sourceRow === null ? lineage.intern(representedRows) : lineage.intern([sourceRow]),
  };
}

function resolveIdentityLineageAndAnnotation(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
  group: number,
): {
  sourceOrder: number;
  lineageKey: number;
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
} {
  const {
    sourceRow,
    frame,
    outlierSourceRow,
    frameRow,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
  } = located;
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
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
    frame,
    table: ctx.table,
    frameRow,
    lineage: ctx.lineage,
    primitiveIndex: facts.primitiveIndex,
  });
  return { sourceOrder, lineageKey, annotationRule, annotationX, annotationY };
}

function resolveIdentityCandidateAttrs(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): IdentityCandidateAttrs {
  const { group, seriesRank, autoMode } = resolveIdentitySeriesAndMode(ctx, facts, located);
  const lineageAnn = resolveIdentityLineageAndAnnotation(ctx, facts, located, group);
  return {
    group,
    seriesRank,
    autoMode,
    ...lineageAnn,
  };
}

function assembleIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): CandidateDatum {
  const attrs = resolveIdentityCandidateAttrs(ctx, facts, located);
  const { xValue, yValue } = resolveCandidateLogicalValues({
    annotationRule: attrs.annotationRule,
    annotationX: attrs.annotationX,
    annotationY: attrs.annotationY,
    outlierSourceRow: located.outlierSourceRow,
    sourceRow: located.sourceRow,
    frame: located.frame,
    frameRow: located.frameRow,
    primitiveIndex: facts.primitiveIndex,
    sourceValue: located.sourceValue,
    xField: located.xField,
    yField: located.yField,
  });
  return {
    xValue,
    yValue,
    ...resolveCandidateStyleValues(located),
    seriesId: attrs.group,
    seriesRank: attrs.seriesRank,
    sourceOrder: attrs.sourceOrder,
    lineage: attrs.lineageKey,
    ...(attrs.autoMode === undefined ? {} : { autoMode: attrs.autoMode }),
  };
}

function resolveCandidateStyleValues(
  located: LocatedIdentityCandidate,
): Pick<
  CandidateDatum,
  "sizeValue" | "linewidthValue" | "alphaValue" | "shapeValue" | "linetypeValue"
> {
  const binding = located.frame?.binding;
  const valueOf = (aesthetic: "size" | "linewidth" | "alpha" | "shape" | "linetype"): CellValue => {
    const style = binding?.[aesthetic];
    if (style === undefined) return null;
    if (located.sourceRow !== null && style.field !== null) {
      return located.sourceValue(style.field);
    }
    const values = located.frame?.[`${aesthetic}Values` as const];
    const frameValue = values?.[located.frameRow];
    if (frameValue !== undefined) return frameValue;
    return style.scaledConstant ?? style.constant;
  };
  return {
    sizeValue: valueOf("size"),
    linewidthValue: valueOf("linewidth"),
    alphaValue: valueOf("alpha"),
    shapeValue: valueOf("shape"),
    linetypeValue: valueOf("linetype"),
  };
}

function resolveIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): CandidateDatum {
  const located = locateIdentityCandidate(ctx, facts);
  return assembleIdentityCandidateDatum(ctx, facts, located);
}

export function createIdentityCandidateDatumResolver(input: {
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
}): (facts: CandidateBuildFacts) => CandidateDatum {
  const ctx: IdentityCandidateResolveContext = input;
  return (facts) => resolveIdentityCandidateDatum(ctx, facts);
}
