/**
 * Lazy identity index for candidate datums that are not source-row backed
 * (stats, annotations): series by source row, group memberships, ordered groups,
 * and pre-bucketed aggregate lineage for O(1) represented-row resolve.
 */
import { bandKey } from "../scales/train.js";
import { cellToNumber } from "../table.js";

import {
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
      const groupKeysThisFrame: string[] = [];
      for (let localRow = 0; localRow < inputGroups.length; localRow++) {
        const group = inputGroups[localRow]!;
        const sourceRow = facetPanels[panelIndex]!.sourceRows?.[localRow] ?? localRow;
        const key = `${frameKey}:${group}`;
        const members = sourceRowsByGroup.get(key);
        if (members === undefined) {
          sourceRowsByGroup.set(key, [sourceRow]);
          groupKeysThisFrame.push(key);
        } else members.push(sourceRow);
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
      // Once-per-group finite-y lists for stats that drop non-finite y in lineage.
      const yField = frame.binding.yField;
      if ((stat === "smooth" || stat === "summary" || stat === "boxplot") && yField !== null) {
        const yColumn = frame.table.column(yField);
        for (const key of groupKeysThisFrame) {
          const rows = sourceRowsByGroup.get(key)!;
          sourceRowsByGroupY.set(
            key,
            rows.filter((row) => Number.isFinite(cellToNumber(yColumn[row]!))),
          );
        }
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
