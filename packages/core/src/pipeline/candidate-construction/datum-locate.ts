/**
 * Locate identity candidates: frame row, outlier context, mapped fields.
 */
import type { CandidateBuildFacts } from "../../candidate-store.js";
import type { GeometryBatch } from "../../scene.js";
import type { CellValue, ColumnTable } from "../../table.js";
import type { FacetPanelDef } from "../facets.js";
import type { LayerFrame, MappedField } from "../types.js";
import { resolveCandidateFrameRow } from "./frame-row.js";
import type { IdentityCandidateResolveContext, LocatedIdentityCandidate } from "./datum-types.js";

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

/** Boxplot outlier local/source row mapping for point primitives. */
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

export function locateIdentityCandidate(
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
