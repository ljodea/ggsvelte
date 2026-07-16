/**
 * Interaction candidate store construction for a completed pipeline scene.
 * Source-backed layers use the cheap raw resolver; stat/annotation layers use
 * the identity-indexed path that reconstructs represented source rows.
 */
import type { BarParams } from "@ggsvelte/spec";

import { buildCandidateStore } from "../candidate-store.js";
import type { CandidateStore } from "../candidate-store.js";
import { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber, ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import { candidateAutoMode, createRawCandidateDatumResolver, deriveLayerGroups } from "./frame.js";
import type { MappedField } from "./types.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildPipelineCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly LayerFrame[])[];
  facetPanels: readonly FacetPanelDef[];
  table: ColumnTable;
  layerFields: readonly MappedField[][];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
}): CandidateStore {
  const {
    scene,
    runId,
    flip,
    bindings,
    panelFrames,
    facetPanels,
    table,
    layerFields,
    color,
    fill,
    lineage,
  } = input;

  let identityIndex: Readonly<{
    seriesByRow: Map<string, number>;
    sourceRowsByGroup: Map<string, number[]>;
    frameGroups: Map<string, number[]>;
  }> | null = null;
  const getIdentityIndex = () => {
    if (identityIndex !== null) return identityIndex;
    const seriesByRow = new Map<string, number>();
    const sourceRowsByGroup = new Map<string, number[]>();
    const frameGroups = new Map<string, number[]>();
    for (let panelIndex = 0; panelIndex < panelFrames.length; panelIndex++) {
      for (const frame of panelFrames[panelIndex] ?? []) {
        const frameKey = `${panelIndex}:${frame.binding.index}`;
        frameGroups.set(frameKey, [...new Set(frame.groups)]);
        const inputGroups = deriveLayerGroups(frame.binding, frame.table);
        for (let localRow = 0; localRow < inputGroups.length; localRow++) {
          const group = inputGroups[localRow]!;
          const sourceRow = facetPanels[panelIndex]!.sourceRows?.[localRow] ?? localRow;
          const key = `${frameKey}:${group}`;
          const members = sourceRowsByGroup.get(key);
          if (members === undefined) sourceRowsByGroup.set(key, [sourceRow]);
          else members.push(sourceRow);
        }
        for (let i = 0; i < frame.rowIndex.length; i++) {
          const sourceRow = frame.rowIndex[i]!;
          if (sourceRow !== NO_ROW) {
            seriesByRow.set(
              `${panelIndex}:${frame.binding.index}:${sourceRow}`,
              frame.groups[i] ?? 0,
            );
          }
        }
      }
    }
    identityIndex = { seriesByRow, sourceRowsByGroup, frameGroups };
    return identityIndex;
  };

  const allSourceBacked = bindings.every(
    (binding) =>
      (binding.layer.stat ?? "identity") === "identity" && binding.ruleForm !== "annotation",
  );

  if (allSourceBacked) {
    return buildCandidateStore(scene, {
      epoch: runId,
      flip,
      datum: createRawCandidateDatumResolver(bindings, table, color, fill, lineage),
    });
  }

  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    datum(facts) {
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
      let frameRow = Math.min(facts.primitiveIndex, Math.max(0, (frame?.n ?? 1) - 1));
      let derivedGroup = frame?.groups[frameRow] ?? 0;
      if (frame !== undefined && batch.kind === "paths") {
        let subpath = 0;
        while (
          subpath + 1 < batch.pathOffsets.length &&
          facts.primitiveIndex >= batch.pathOffsets[subpath + 1]!
        )
          subpath++;
        derivedGroup = orderedGroups[Math.min(subpath, orderedGroups.length - 1)] ?? 0;
        const rowsInGroup = frame.groups
          .map((group, row) => ({ group, row }))
          .filter((entry) => entry.group === derivedGroup)
          .map((entry) => entry.row)
          .toSorted((a, b) => (frame.xNumeric?.[a] ?? a) - (frame.xNumeric?.[b] ?? b));
        const local = facts.primitiveIndex - (batch.pathOffsets[subpath] ?? 0);
        const reflected =
          local < rowsInGroup.length ? local : Math.max(0, rowsInGroup.length * 2 - 1 - local);
        frameRow = rowsInGroup[Math.min(reflected, rowsInGroup.length - 1)] ?? frameRow;
      } else if (frame !== undefined && batch.kind === "segments") {
        if (frame.binding.layer.geom === "errorbar")
          frameRow = Math.floor(facts.primitiveIndex / 3);
        else if (frame.binding.layer.geom === "boxplot" && batch.rowIndex.length >= frame.n * 2)
          frameRow = Math.floor(facts.primitiveIndex / 2);
        derivedGroup = frame.groups[Math.min(frameRow, frame.groups.length - 1)] ?? derivedGroup;
      } else if (
        frame?.box !== null &&
        frame?.binding.layer.geom === "boxplot" &&
        batch.kind === "points"
      ) {
        frameRow = frame.box.outlierBox[facts.primitiveIndex] ?? frameRow;
        derivedGroup = frame.groups[frameRow] ?? derivedGroup;
      }
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
        const stat = frame.binding.layer.stat ?? "identity";
        const aggregateXField = frame.binding.xField;
        const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
        if (
          aggregateXField !== null &&
          outputX !== null &&
          (stat === "count" || stat === "summary" || stat === "boxplot")
        ) {
          const outputKey = bandKey(outputX);
          representedRows = representedRows.filter(
            (row) => bandKey(table.column(aggregateXField)[row]) === outputKey,
          );
        } else if (
          stat === "bin" &&
          aggregateXField !== null &&
          frame.xmin !== null &&
          frame.xmax !== null
        ) {
          const hi = frame.xmax[frameRow]!;
          const lo = frame.xmin[frameRow]!;
          const closed = ((frame.binding.layer.params ?? {}) as BarParams).closed ?? "right";
          const frameGroup = frame.groups[frameRow];
          const firstInGroup = frameRow === 0 || frame.groups[frameRow - 1] !== frameGroup;
          const lastInGroup = frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== frameGroup;
          representedRows = representedRows.filter((row) => {
            const value = cellToNumber(table.column(aggregateXField)[row]!);
            if (!Number.isFinite(value)) return false;
            return closed === "right"
              ? value <= hi && (value > lo || (firstInGroup && value >= lo))
              : value >= lo && (value < hi || (lastInGroup && value <= hi));
          });
        }
        const aggregateYField = frame.binding.yField;
        if (
          (stat === "smooth" || stat === "summary" || stat === "boxplot") &&
          aggregateYField !== null
        ) {
          representedRows = representedRows.filter((row) =>
            Number.isFinite(cellToNumber(table.column(aggregateYField)[row]!)),
          );
        }
      }
      return {
        xValue: annotationRule
          ? annotationX
          : outlierSourceRow === null
            ? sourceRow === null
              ? (frame?.xValues?.[frameRow] ?? frame?.xNumeric?.[frameRow] ?? null)
              : sourceValue(xField)
            : (frame?.box?.outlierX[facts.primitiveIndex] ?? null),
        yValue: annotationRule
          ? annotationY
          : outlierSourceRow === null
            ? sourceRow === null
              ? (frame?.yNumeric?.[frameRow] ?? frame?.box?.middle[frameRow] ?? null)
              : sourceValue(yField)
            : (frame?.box?.outlierY[facts.primitiveIndex] ?? null),
        seriesId: group,
        seriesRank: colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group,
        sourceOrder: sourceRow ?? outlierSourceRow ?? facts.primitiveIndex,
        lineage: sourceRow === null ? lineage.intern(representedRows) : lineage.intern([sourceRow]),
        autoMode,
      };
    },
  });
}
