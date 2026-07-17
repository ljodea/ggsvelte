/**
 * Lazy identity index for candidate datums that are not source-row backed
 * (stats, annotations): series by source row, group memberships, ordered groups,
 * and pre-bucketed aggregate lineage for O(1) represented-row resolve.
 */
import { bandKey } from "../scales/train.js";

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
  const frameGroups = new Map<string, number[]>();
  for (let panelIndex = 0; panelIndex < panelFrames.length; panelIndex++) {
    for (const frame of panelFrames[panelIndex] ?? []) {
      const layerIndex = frame.binding.index;
      const frameKey = `${panelIndex}:${layerIndex}`;
      frameGroups.set(frameKey, [...new Set(frame.groups)]);
      const inputGroups = deriveLayerGroups(frame.binding, frame.table);
      const xField = frame.binding.xField;
      const xColumn = xField === null ? null : frame.table.column(xField);
      for (let localRow = 0; localRow < inputGroups.length; localRow++) {
        const group = inputGroups[localRow]!;
        const sourceRow = facetPanels[panelIndex]!.sourceRows?.[localRow] ?? localRow;
        const key = `${frameKey}:${group}`;
        const members = sourceRowsByGroup.get(key);
        if (members === undefined) sourceRowsByGroup.set(key, [sourceRow]);
        else members.push(sourceRow);
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
      const stat = frame.binding.layer.stat ?? "identity";
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
  return { seriesByRow, sourceRowsByGroup, sourceRowsByGroupX, sourceRowsByGroupBin, frameGroups };
}
