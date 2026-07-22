import type { CandidateBuildFacts, CandidateDatum } from "../../candidate-store.js";
import type { LineageStore } from "../../identity.js";
import type { GeometryBatch, Scene } from "../../scene.js";
import type { CellValue, ColumnTable } from "../../table.js";
import type { FacetPanelDef } from "../facets.js";
import { candidateAutoMode } from "../frame-candidates-auto-mode.js";
import type { LayerBinding, LayerFrame, MappedField, ResolvedColorScale } from "../types.js";
import { resolveCandidateFrameRow } from "./frame-row.js";
import { filterRepresentedSourceRows } from "./identity-index.js";
import type { CandidateIdentityIndex } from "./identity-index.js";

// ---------------------------------------------------------------------------
// Annotation context
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Candidate datum assembly
// ---------------------------------------------------------------------------
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
    seriesId: attrs.group,
    seriesRank: attrs.seriesRank,
    sourceOrder: attrs.sourceOrder,
    lineage: attrs.lineageKey,
    autoMode: attrs.autoMode,
  };
}

// ---------------------------------------------------------------------------
// Candidate attribute facts
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Candidate attributes
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Identity resolver context
// ---------------------------------------------------------------------------
interface IdentityCandidateResolveContext {
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

// ---------------------------------------------------------------------------
// Mapped field lookup
// ---------------------------------------------------------------------------
function resolveCandidateFieldChannels(fields: readonly MappedField[]): {
  xField: string | undefined;
  yField: string | undefined;
  colorField: string | undefined;
  fillField: string | undefined;
} {
  return {
    xField: fields.find((field) => field.channel === "x")?.field,
    yField: fields.find((field) => field.channel === "y")?.field,
    colorField: fields.find((field) => field.channel === "color")?.field,
    fillField: fields.find((field) => field.channel === "fill")?.field,
  };
}

function makeSourceValueLookup(
  table: ColumnTable,
  sourceRow: number | null,
): (field: string | undefined) => CellValue {
  return (field) =>
    sourceRow === null || field === undefined ? null : table.column(field)[sourceRow]!;
}

// ---------------------------------------------------------------------------
// Lineage and annotation
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Located Candidate facts
// ---------------------------------------------------------------------------
interface LocatedIdentityCandidate {
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
  sourceRowsByGroupX: Map<string, number[]>;
  sourceRowsByGroupBin: Map<string, number[]>;
  sourceRowsByGroupY: Map<string, number[]>;
}

// ---------------------------------------------------------------------------
// Candidate location
// ---------------------------------------------------------------------------
function locateIdentityCandidate(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): LocatedIdentityCandidate {
  const {
    seriesByRow,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
    frameGroups,
  } = ctx.getIdentityIndex();
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
    sourceRowsByGroupY,
  };
}

// ---------------------------------------------------------------------------
// Ordinal series rank
// ---------------------------------------------------------------------------
/**
 * O(1) assignment rank, or -1 when scale/field does not apply.
 * `readValue` is a thunk so sequential/null scales never force a cell read.
 */
export function ordinalColorRank(
  resolved: ResolvedColorScale | null,
  field: string | null | undefined,
  readValue: () => CellValue,
): number {
  if (
    (resolved?.kind !== "ordinal" && resolved?.kind !== "manual") ||
    field === null ||
    field === undefined
  )
    return -1;
  return resolved.scale.indexOf(readValue()) ?? -1;
}

export function ordinalSeriesRank(input: {
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  colorField: string | undefined;
  fillField: string | undefined;
  sourceRow: number | null;
  sourceValue: (field: string | undefined) => CellValue;
  group: number;
}): number {
  const { color, fill, colorField, fillField, sourceRow, sourceValue, group } = input;
  if (sourceRow === null) return group;
  const colorRank = ordinalColorRank(color, colorField, () => sourceValue(colorField));
  const fillRank = ordinalColorRank(fill, fillField, () => sourceValue(fillField));
  return colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group;
}

// ---------------------------------------------------------------------------
// Boxplot outlier context
// ---------------------------------------------------------------------------
export function resolveOutlierContext(input: {
  frame: LayerFrame | undefined;
  batch: GeometryBatch;
  primitiveIndex: number;
  facetPanel: FacetPanelDef | undefined;
}): { outlierLocalRow: number | null; outlierSourceRow: number | null } {
  const { frame, batch, primitiveIndex, facetPanel } = input;
  const outlierLocalRow =
    frame?.box !== null && frame?.binding.layer.geom === "boxplot" && batch.kind === "points"
      ? (frame?.box.outlierRow[primitiveIndex] ?? null)
      : null;
  const outlierSourceRow =
    outlierLocalRow === null
      ? null
      : (facetPanel?.sourceRows?.[outlierLocalRow] ?? outlierLocalRow);
  return { outlierLocalRow, outlierSourceRow };
}

// ---------------------------------------------------------------------------
// Represented source rows
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Identity datum resolution
// ---------------------------------------------------------------------------
function resolveIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): CandidateDatum {
  const located = locateIdentityCandidate(ctx, facts);
  return assembleIdentityCandidateDatum(ctx, facts, located);
}

// ---------------------------------------------------------------------------
// Series identity and mode
// ---------------------------------------------------------------------------
function resolveIdentitySeriesAndMode(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): { group: number; seriesRank: number; autoMode: ReturnType<typeof candidateAutoMode> } {
  const { sourceRow, frame, derivedGroup, sourceValue, colorField, fillField, seriesByRow } =
    located;

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
  return { group, seriesRank, autoMode };
}

// ---------------------------------------------------------------------------
// Candidate series
// ---------------------------------------------------------------------------
export function resolveCandidateSeries(input: {
  sourceRow: number | null;
  derivedGroup: number;
  seriesByRow: Map<string, number>;
  panelIndex: number;
  layerIndex: number;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  colorField: string | undefined;
  fillField: string | undefined;
  sourceValue: (field: string | undefined) => CellValue;
}): { group: number; seriesRank: number } {
  const {
    sourceRow,
    derivedGroup,
    seriesByRow,
    panelIndex,
    layerIndex,
    color,
    fill,
    colorField,
    fillField,
    sourceValue,
  } = input;
  const group =
    sourceRow === null
      ? derivedGroup
      : (seriesByRow.get(`${panelIndex}:${layerIndex}:${sourceRow}`) ?? 0);
  const seriesRank = ordinalSeriesRank({
    color,
    fill,
    colorField,
    fillField,
    sourceRow,
    sourceValue,
    group,
  });
  return { group, seriesRank };
}

// ---------------------------------------------------------------------------
// Logical values
// ---------------------------------------------------------------------------
function semanticFrameNumber(
  frame: LayerFrame | undefined,
  axis: "x" | "y",
  value: number | undefined,
): CellValue {
  if (value === undefined || !Number.isFinite(value)) return value ?? null;
  const transform =
    axis === "x" ? frame?.binding.xTransform?.transform : frame?.binding.yTransform?.transform;
  return transform === undefined ? value : transform.inverse(value);
}

export function resolveCandidateLogicalValues(input: {
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
  outlierSourceRow: number | null;
  sourceRow: number | null;
  frame: LayerFrame | undefined;
  frameRow: number;
  primitiveIndex: number;
  sourceValue: (field: string | undefined) => CellValue;
  xField: string | undefined;
  yField: string | undefined;
}): { xValue: CellValue; yValue: CellValue } {
  const {
    annotationRule,
    annotationX,
    annotationY,
    outlierSourceRow,
    sourceRow,
    frame,
    frameRow,
    primitiveIndex,
    sourceValue,
    xField,
    yField,
  } = input;

  const xValue = annotationRule
    ? annotationX
    : outlierSourceRow === null
      ? sourceRow === null
        ? (frame?.xValues?.[frameRow] ??
          semanticFrameNumber(frame, "x", frame?.xNumeric?.[frameRow]))
        : sourceValue(xField)
      : (frame?.box?.outlierX[primitiveIndex] ?? null);

  const yValue = annotationRule
    ? annotationY
    : outlierSourceRow === null
      ? sourceRow === null
        ? (frame?.yValues?.[frameRow] ??
          semanticFrameNumber(
            frame,
            "y",
            frame?.yNumeric?.[frameRow] ?? frame?.box?.middle[frameRow],
          ))
        : sourceValue(yField)
      : semanticFrameNumber(frame, "y", frame?.box?.outlierY[primitiveIndex]);

  return { xValue, yValue };
}

// ---------------------------------------------------------------------------
// Identity datum resolver
// ---------------------------------------------------------------------------
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
