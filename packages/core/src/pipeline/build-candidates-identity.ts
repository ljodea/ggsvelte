/**
 * Lazy identity index for candidate datums that are not source-row backed
 * (stats, annotations): series by source row, group memberships, ordered groups.
 */
import type { FacetPanelDef } from "./facets.js";
import { deriveLayerGroups } from "./frame.js";
import type { LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";

export interface CandidateIdentityIndex {
  readonly seriesByRow: Map<string, number>;
  readonly sourceRowsByGroup: Map<string, number[]>;
  readonly frameGroups: Map<string, number[]>;
}

export function buildCandidateIdentityIndex(
  panelFrames: readonly (readonly LayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): CandidateIdentityIndex {
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
  return { seriesByRow, sourceRowsByGroup, frameGroups };
}
