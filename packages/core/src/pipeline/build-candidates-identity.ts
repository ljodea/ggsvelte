/**
 * Lazy identity index for candidate datums that are not source-row backed
 * (stats, annotations): series by source row, group memberships, ordered groups,
 * and pre-bucketed aggregate lineage for O(1) represented-row resolve.
 */
import { bandKey } from "../scales/train.js";
import { cellToNumber } from "../table.js";

import {
  appendSourceRowByGroupKey,
  appendSourceRowByGroupX,
  buildBinLineageBuckets,
} from "./build-candidates-identity-aggregate.js";
import type { FacetPanelDef } from "./facets.js";
import { deriveLayerGroups } from "./frame.js";
import type { LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";

export interface CandidateIdentityIndex {
  readonly seriesByRow: Map<string, number>;
  readonly sourceRowsByGroup: Map<string, number[]>;
  /** `${panel}:${layer}:${group}:${bandKey(x)}` → source rows (count/summary/boxplot). */
  readonly sourceRowsByGroupX: Map<string, number[]>;
  /** `${panel}:${layer}:${group}:${frameRow}` → source rows (bin/histogram). */
  readonly sourceRowsByGroupBin: Map<string, number[]>;
  /**
   * `${panel}:${layer}:${group}` → source rows with finite y
   * (smooth/summary/boxplot). Built once so evaluation-grid marks (smooth n≈80)
   * reuse the same list instead of re-filtering O(g) per mark.
   */
  readonly sourceRowsByGroupY: Map<string, number[]>;
  readonly frameGroups: Map<string, number[]>;
}

export function buildCandidateIdentityIndex(
  panelFrames: readonly (readonly LayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): CandidateIdentityIndex {
  const seriesByRow = new Map<string, number>();
  const sourceRowsByGroup = new Map<string, number[]>();
  const sourceRowsByGroupX = new Map<string, number[]>();
  const sourceRowsByGroupBin = new Map<string, number[]>();
  const sourceRowsByGroupY = new Map<string, number[]>();
  const frameGroups = new Map<string, number[]>();
  for (let panelIndex = 0; panelIndex < panelFrames.length; panelIndex++) {
    for (const frame of panelFrames[panelIndex] ?? []) {
      const layerIndex = frame.binding.index;
      const frameKey = `${panelIndex}:${layerIndex}`;
      frameGroups.set(frameKey, [...new Set(frame.groups)]);
      const inputGroups = deriveLayerGroups(frame.binding, frame.table);
      const stat = frame.binding.layer.stat ?? "identity";
      // Only count/summary/boxplot resolve via group×x buckets; skip for other layers.
      const bucketByX = stat === "count" || stat === "summary" || stat === "boxplot";
      const xField = frame.binding.xField;
      const xColumn = bucketByX && xField !== null ? frame.table.column(xField) : null;
      // Finite-y membership uses panel-local table indexes (localRow), then stores
      // source-table rows — same mapping as sourceRowsByGroup itself.
      const yField = frame.binding.yField;
      const finiteY =
        (stat === "smooth" || stat === "summary" || stat === "boxplot") && yField !== null;
      const yColumn = finiteY ? frame.table.column(yField) : null;
      for (let localRow = 0; localRow < inputGroups.length; localRow++) {
        const group = inputGroups[localRow]!;
        const sourceRow = facetPanels[panelIndex]!.sourceRows?.[localRow] ?? localRow;
        const key = `${frameKey}:${group}`;
        appendSourceRowByGroupKey(sourceRowsByGroup, key, sourceRow);
        if (xColumn !== null) {
          appendSourceRowByGroupX({
            sourceRowsByGroupX,
            panelIndex,
            layerIndex,
            group,
            xKey: bandKey(xColumn[localRow]),
            sourceRow,
          });
        }
        if (yColumn !== null && Number.isFinite(cellToNumber(yColumn[localRow]!))) {
          appendSourceRowByGroupKey(sourceRowsByGroupY, key, sourceRow);
        }
      }
      if (stat === "bin") {
        buildBinLineageBuckets({
          frame,
          panelIndex,
          layerIndex,
          facetPanel: facetPanels[panelIndex]!,
          sourceRowsByGroupBin,
        });
      }
      for (let i = 0; i < frame.rowIndex.length; i++) {
        const sourceRow = frame.rowIndex[i]!;
        if (sourceRow !== NO_ROW) {
          seriesByRow.set(`${panelIndex}:${layerIndex}:${sourceRow}`, frame.groups[i] ?? 0);
        }
      }
    }
  }
  // Seal bucket arrays so resolve-time consumers cannot mutate shared lineage.
  for (const map of [
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
  ]) {
    for (const [key, rows] of map) map.set(key, Object.freeze(rows) as number[]);
  }
  return {
    seriesByRow,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
    frameGroups,
  };
}
