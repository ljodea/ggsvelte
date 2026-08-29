import type { FacetPanelDef } from "../facets.js";
import { positionColumn, xConversionOf, yConversionOf } from "../temporal-position.js";
import type { FinalizedLayerFrame } from "../types.js";
import { NO_ROW } from "../types.js";
import {
  type AggregateLineageXView,
  aggregateLineageXKey,
  appendSourceRowByGroupKey,
  appendSourceRowByGroupX,
  buildBinLineageBuckets,
  resolveAggregateLineageXView,
} from "./identity-buckets.js";
import { globalSourceRowForInputRow } from "../source-row-lineage.js";

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

type CandidateIdentityMaps = CandidateIdentityIndex;

interface FrameIdentityViews {
  readonly frameKey: string;
  readonly layerIndex: number;
  readonly lineageXView: AggregateLineageXView | null;
  readonly stat: string;
  readonly xField: string | null;
  readonly xNumericForSmooth: Float64Array | null;
  readonly yNumeric: Float64Array | null;
}

function createCandidateIdentityMaps(): CandidateIdentityMaps {
  return {
    seriesByRow: new Map(),
    sourceRowsByGroup: new Map(),
    sourceRowsByGroupX: new Map(),
    sourceRowsByGroupBin: new Map(),
    sourceRowsByGroupY: new Map(),
    frameGroups: new Map(),
  };
}

function frameIdentityViews(frame: FinalizedLayerFrame, panelIndex: number): FrameIdentityViews {
  const layerIndex = frame.binding.index;
  const stat = frame.binding.layer.stat ?? "identity";
  const xField = frame.binding.xField;
  const yField = frame.binding.yField;
  const bucketByX = stat === "count" || stat === "summary" || stat === "boxplot";
  const finiteY =
    (stat === "smooth" || stat === "summary" || stat === "boxplot") && yField !== null;
  const yNumeric =
    finiteY && yField !== null
      ? positionColumn(frame.table, yField, yConversionOf(frame.binding), frame.binding.yTransform)
      : null;
  const xNumericForSmooth =
    stat === "smooth" && xField !== null
      ? positionColumn(frame.table, xField, xConversionOf(frame.binding), frame.binding.xTransform)
      : null;
  const lineageXView =
    bucketByX && xField !== null
      ? resolveAggregateLineageXView(frame.table, xField, frame.binding)
      : null;
  return {
    frameKey: `${panelIndex}:${layerIndex}`,
    layerIndex,
    lineageXView,
    stat,
    xField,
    xNumericForSmooth,
    yNumeric,
  };
}

function indexFrameInputRows(
  frame: FinalizedLayerFrame,
  panelIndex: number,
  maps: CandidateIdentityMaps,
  views: FrameIdentityViews,
): void {
  for (let localRow = 0; localRow < frame.inputGroups.length; localRow++) {
    const group = frame.inputGroups[localRow]!;
    const sourceRow = globalSourceRowForInputRow(frame, localRow);
    const key = `${views.frameKey}:${group}`;
    appendSourceRowByGroupKey(maps.sourceRowsByGroup, key, sourceRow);
    if (views.lineageXView !== null && views.xField !== null) {
      appendSourceRowByGroupX({
        sourceRowsByGroupX: maps.sourceRowsByGroupX,
        panelIndex,
        layerIndex: views.layerIndex,
        group,
        xKey: aggregateLineageXKey(
          frame.table,
          views.xField,
          localRow,
          frame.binding,
          views.lineageXView,
        ),
        sourceRow,
        include: views.yNumeric === null || Number.isFinite(views.yNumeric[localRow]!),
      });
    }
    const yOk = views.yNumeric !== null && Number.isFinite(views.yNumeric[localRow]!);
    const xOk =
      views.xNumericForSmooth === null || Number.isFinite(views.xNumericForSmooth[localRow]!);
    if (yOk && xOk) appendSourceRowByGroupKey(maps.sourceRowsByGroupY, key, sourceRow);
  }
}

function indexFrameSeriesRows(
  frame: FinalizedLayerFrame,
  panelIndex: number,
  layerIndex: number,
  seriesByRow: Map<string, number>,
): void {
  for (let row = 0; row < frame.rowIndex.length; row++) {
    const sourceRow = frame.rowIndex[row]!;
    if (sourceRow !== NO_ROW) {
      seriesByRow.set(`${panelIndex}:${layerIndex}:${sourceRow}`, frame.groups[row] ?? 0);
    }
  }
}

function indexFrame(
  frame: FinalizedLayerFrame,
  panelIndex: number,
  maps: CandidateIdentityMaps,
): void {
  const views = frameIdentityViews(frame, panelIndex);
  maps.frameGroups.set(views.frameKey, [...new Set(frame.groups)]);
  indexFrameInputRows(frame, panelIndex, maps, views);
  if (views.stat === "bin" || views.stat === "summary_bin") {
    buildBinLineageBuckets({
      frame,
      panelIndex,
      layerIndex: views.layerIndex,
      sourceRowsByGroupBin: maps.sourceRowsByGroupBin,
    });
  }
  indexFrameSeriesRows(frame, panelIndex, views.layerIndex, maps.seriesByRow);
}

function freezeIdentityBuckets(maps: CandidateIdentityMaps): void {
  for (const map of [
    maps.sourceRowsByGroup,
    maps.sourceRowsByGroupX,
    maps.sourceRowsByGroupBin,
    maps.sourceRowsByGroupY,
  ]) {
    for (const [key, rows] of map) map.set(key, Object.freeze(rows) as number[]);
  }
}

export function buildCandidateIdentityIndex(
  panelFrames: readonly (readonly FinalizedLayerFrame[])[],
  _facetPanels: readonly FacetPanelDef[],
): CandidateIdentityIndex {
  const maps = createCandidateIdentityMaps();
  for (let panelIndex = 0; panelIndex < panelFrames.length; panelIndex++) {
    for (const frame of panelFrames[panelIndex] ?? []) {
      indexFrame(frame, panelIndex, maps);
    }
  }
  freezeIdentityBuckets(maps);
  return maps;
}

export function createLazyIdentityIndex(
  panelFrames: readonly (readonly FinalizedLayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): () => CandidateIdentityIndex {
  let identityIndex: CandidateIdentityIndex | null = null;
  return () => {
    if (identityIndex !== null) return identityIndex;
    identityIndex = buildCandidateIdentityIndex(panelFrames, facetPanels);
    return identityIndex;
  };
}
