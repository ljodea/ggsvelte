import type { FacetPanelDef } from "../facets.js";
import { positionColumn, xConversionOf, yConversionOf } from "../temporal-position.js";
import type { LayerFrame } from "../types.js";
import { NO_ROW } from "../types.js";
import {
  aggregateLineageXKey,
  appendSourceRowByGroupKey,
  appendSourceRowByGroupX,
  buildBinLineageBuckets,
} from "./identity-buckets.js";

export interface CandidateIdentityIndex {
  readonly seriesByRow: Map<string, number>;
  readonly sourceRowsByGroup: Map<string, number[]>;
  /**
   * `${panel}:${layer}:${group}:${bandKey(x)}` → source rows for aggregate
   * group×x lineage (count/summary/boxplot).
   *
   * Count: every source row in the group×x bucket.
   * Summary/boxplot (y mapped): only rows with finite y — the final represented
   * membership so resolve returns this frozen array without a per-mark y scan
   * (mirrors `sourceRowsByGroupY` / issue #216). Empty buckets are still present
   * when every row at that x is non-finite, so lookups never fall through to a
   * full-group re-scan.
   */
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
      // Pre-stat groups cached on the frame during buildFrame (issue #217).
      const inputGroups = frame.inputGroups;
      const stat = frame.binding.layer.stat ?? "identity";
      // Only count/summary/boxplot resolve via group×x buckets; skip for other layers.
      const bucketByX = stat === "count" || stat === "summary" || stat === "boxplot";
      const xField = frame.binding.xField;
      // localRow → sourceRow invariant: panel-local table indexes drive
      // parse/finite-y membership; stored memberships are always source-table
      // rows via `facetPanel.sourceRows?.[localRow] ?? localRow` (unfaceted =
      // identity). Faceted temporal summary/count must not intern localRow into
      // LineageStore keys (#437).
      const yField = frame.binding.yField;
      const finiteY =
        (stat === "smooth" || stat === "summary" || stat === "boxplot") && yField !== null;
      // Match stat reads: finite membership is after the pre-stat transform so
      // log/sqrt OOD rows do not appear in candidate lineage for the fit.
      const yNumeric =
        finiteY && yField !== null
          ? positionColumn(
              frame.table,
              yField,
              yConversionOf(frame.binding),
              frame.binding.yTransform,
            )
          : null;
      const xNumericForSmooth =
        stat === "smooth" && xField !== null
          ? positionColumn(
              frame.table,
              xField,
              xConversionOf(frame.binding),
              frame.binding.xTransform,
            )
          : null;
      for (let localRow = 0; localRow < inputGroups.length; localRow++) {
        const group = inputGroups[localRow]!;
        const sourceRow =
          frame.inputSourceRows?.[localRow] ??
          facetPanels[panelIndex]!.sourceRows?.[localRow] ??
          localRow;
        const key = `${frameKey}:${group}`;
        appendSourceRowByGroupKey(sourceRowsByGroup, key, sourceRow);
        if (bucketByX && xField !== null) {
          // Summary/boxplot: only finite y belongs in the final represented
          // membership. Always create the group×x key (include=false) so an
          // all-non-finite bucket is an empty frozen array, not a map miss.
          const includeInX = yNumeric === null || Number.isFinite(yNumeric[localRow]!);
          appendSourceRowByGroupX({
            sourceRowsByGroupX,
            panelIndex,
            layerIndex,
            group,
            xKey: aggregateLineageXKey(frame.table, xField, localRow, frame.binding),
            sourceRow,
            include: includeInX,
          });
        }
        const yOk = yNumeric !== null && Number.isFinite(yNumeric[localRow]!);
        const xOk = xNumericForSmooth === null || Number.isFinite(xNumericForSmooth[localRow]!);
        if (yOk && xOk) {
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

export function createLazyIdentityIndex(
  panelFrames: readonly (readonly LayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): () => CandidateIdentityIndex {
  let identityIndex: CandidateIdentityIndex | null = null;
  return () => {
    if (identityIndex !== null) return identityIndex;
    identityIndex = buildCandidateIdentityIndex(panelFrames, facetPanels);
    return identityIndex;
  };
}
