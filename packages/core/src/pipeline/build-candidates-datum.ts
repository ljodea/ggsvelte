/**
 * Stat/annotation candidate datum resolver: reconstructs series, ranks, and
 * represented source-row lineages from layer frames + identity index.
 */
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import { resolveCandidateLogicalValues } from "./build-candidates-datum-values.js";
import { resolveCandidateFrameRow } from "./build-candidates-frame-row.js";
import type { CandidateIdentityIndex } from "./build-candidates-identity.js";
import { filterRepresentedSourceRows } from "./build-candidates-lineage.js";
import type { FacetPanelDef } from "./facets.js";
import { candidateAutoMode } from "./frame.js";
import type { MappedField } from "./types.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";

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
  const {
    scene,
    bindings,
    panelFrames,
    facetPanels,
    table,
    layerFields,
    color,
    fill,
    lineage,
    getIdentityIndex,
  } = input;

  return (facts) => {
    const { seriesByRow, sourceRowsByGroup, frameGroups } = getIdentityIndex();
    const fields = layerFields[facts.layerIndex] ?? [];
    const sourceRow = facts.rowIndex;
    const frame = panelFrames[facts.panelIndex]?.[facts.layerIndex];
    const batch = scene.batches[facts.batchIndex]!;
    const outlierLocalRow =
      frame?.box !== null && frame?.binding.layer.geom === "boxplot" && batch.kind === "points"
        ? (frame?.box.outlierRow[facts.primitiveIndex] ?? null)
        : null;
    const outlierSourceRow =
      outlierLocalRow === null
        ? null
        : (facetPanels[facts.panelIndex]?.sourceRows?.[outlierLocalRow] ?? outlierLocalRow);
    const orderedGroups = frameGroups.get(`${facts.panelIndex}:${facts.layerIndex}`) ?? [0];
    const { frameRow, derivedGroup } = resolveCandidateFrameRow({
      frame,
      batch,
      primitiveIndex: facts.primitiveIndex,
      orderedGroups,
      outlierLocalRow,
    });
    const sourceValue = (field: string | undefined): CellValue =>
      sourceRow === null || field === undefined ? null : table.column(field)[sourceRow]!;
    const xField = fields.find((field) => field.channel === "x")?.field;
    const yField = fields.find((field) => field.channel === "y")?.field;
    const colorField = fields.find((field) => field.channel === "color")?.field;
    const fillField = fields.find((field) => field.channel === "fill")?.field;
    const group =
      sourceRow === null
        ? derivedGroup
        : (seriesByRow.get(`${facts.panelIndex}:${facts.layerIndex}:${sourceRow}`) ?? 0);
    const ordinalRank = (resolved: ResolvedColorScale | null, field: string | undefined) => {
      if (resolved?.kind !== "ordinal" || field === undefined || sourceRow === null) return -1;
      const key = bandKey(sourceValue(field));
      return resolved.scale.domain.findIndex((value) => bandKey(value) === key);
    };
    const colorRank = ordinalRank(color, colorField);
    const fillRank = ordinalRank(fill, fillField);
    const autoMode = candidateAutoMode(
      frame?.binding ?? bindings[facts.layerIndex]!,
      facts.primitiveIndex,
    );
    const annotationRule = frame?.binding.ruleForm === "annotation";
    const annotationX = annotationRule ? (frame.xIntercepts[facts.primitiveIndex] ?? null) : null;
    const annotationY = annotationRule
      ? (frame.yIntercepts[facts.primitiveIndex - frame.xIntercepts.length] ?? null)
      : null;
    let representedRows =
      outlierSourceRow === null
        ? (sourceRowsByGroup.get(`${facts.panelIndex}:${facts.layerIndex}:${group}`) ?? [])
        : [outlierSourceRow];
    if (sourceRow === null && frame !== undefined) {
      representedRows = filterRepresentedSourceRows({
        frame,
        table,
        frameRow,
        baseRows: representedRows,
      });
    }
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
      seriesRank: colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group,
      sourceOrder: sourceRow ?? outlierSourceRow ?? facts.primitiveIndex,
      lineage: sourceRow === null ? lineage.intern(representedRows) : lineage.intern([sourceRow]),
      autoMode,
    };
  };
}
