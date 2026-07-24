/**
 * Locate identity candidates: frame row, outlier context, mapped fields.
 */
import type { CandidateBuildFacts } from "../../candidate-store.js";
import type { GeometryBatch } from "../../scene.js";
import type { CellValue } from "../../table.js";
import type { SourceRegistry } from "../source-registry.js";
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

/**
 * Read a mapped field for one candidate row.
 *
 * The row id is global across every registered source, and a layer carrying
 * its own `data` has its own table with its own fields (#589) — so the table
 * is resolved from the row, never assumed to be the plot's.
 */
function makeSourceValueLookup(
  sources: SourceRegistry,
  sourceRow: number | null,
): (field: string | undefined) => CellValue {
  return (field) => {
    if (sourceRow === null || field === undefined) return null;
    const located = sources.locate(sourceRow);
    if (located === null) return null;
    return located.table.column(field)[located.localRow]!;
  };
}

/**
 * Boxplot outlier source row for point primitives.
 *
 * `frame.box.outlierRow` holds finalized global SourceRegistry ids after
 * {@link finalizeFrameSourceRows} during panel assembly.
 */
export function resolveOutlierContext(input: {
  frame: LayerFrame | undefined;
  batch: GeometryBatch;
  primitiveIndex: number;
}): { outlierLocalRow: number | null; outlierSourceRow: number | null } {
  const { frame, batch, primitiveIndex } = input;
  const outlierSourceRow =
    frame?.box !== null && frame?.binding.layer.geom === "boxplot" && batch.kind === "points"
      ? (frame?.box.outlierRow[primitiveIndex] ?? null)
      : null;
  // outlierLocalRow kept for frame-row call sites; same global id (no panel remap).
  return { outlierLocalRow: outlierSourceRow, outlierSourceRow };
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
  });
  const orderedGroups = frameGroups.get(`${facts.panelIndex}:${facts.layerIndex}`) ?? [0];
  const { frameRow, derivedGroup } = resolveCandidateFrameRow({
    frame,
    batch,
    primitiveIndex: facts.primitiveIndex,
    orderedGroups,
    outlierLocalRow,
  });
  const sourceValue = makeSourceValueLookup(ctx.sources, sourceRow);
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
