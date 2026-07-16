/**
 * Layer-frame construction: run per-panel stats to produce LayerFrames,
 * remap facet-local rows to source indices, and re-export candidate helpers.
 */
import type { ColumnTable } from "../table.js";

import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";
import { deriveLayerGroups, emptyFrameExtras, interceptList } from "./frame-helpers.js";
import { buildNonIdentityFrame } from "./frame-stats.js";

export { deriveLayerGroups } from "./frame-helpers.js";
export { createRawCandidateDatumResolver, candidateAutoMode } from "./frame-candidates.js";

export function buildFrame(
  binding: LayerBinding,
  table: ColumnTable,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame {
  const n = table.rowCount;

  if (binding.ruleForm === "annotation") {
    const params = (layer.params ?? {}) as { xintercept?: unknown; yintercept?: unknown };
    return {
      binding,
      table,
      n: 0,
      xValues: null,
      xNumeric: null,
      yNumeric: null,
      groups: [],
      rowIndex: new Uint32Array(0),
      colorValues: null,
      fillValues: null,
      labelValues: null,
      ...emptyFrameExtras(),
      xIntercepts: interceptList(params.xintercept),
      yIntercepts: interceptList(params.yintercept),
    };
  }

  const groups = deriveLayerGroups(binding, table);
  const nonIdentity = buildNonIdentityFrame(binding, table, groups, warnings, advisories, binRange);
  if (nonIdentity !== null) return nonIdentity;

  // --- identity ----------------------------------------------------------------
  return {
    binding,
    table,
    n,
    xValues: binding.xField === null ? null : table.column(binding.xField),
    xNumeric: binding.xField === null ? null : table.numeric(binding.xField),
    yNumeric: binding.yField === null ? null : table.numeric(binding.yField),
    groups,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
    colorValues: binding.color.field === null ? null : table.column(binding.color.field),
    fillValues: binding.fill.field === null ? null : table.column(binding.fill.field),
    labelValues: binding.labelField === null ? null : table.column(binding.labelField),
    ...emptyFrameExtras(),
    ymin: binding.yminField === null ? null : table.numeric(binding.yminField),
    ymax: binding.ymaxField === null ? null : table.numeric(binding.ymaxField),
  };
}

/**
 * Facet frames index into the PANEL table; hit-testing/tooltips need SOURCE
 * rows, so remap through the partition (NO_ROW stays NO_ROW).
 */
export function remapSourceRows(frame: LayerFrame, sourceRows: number[] | null): void {
  if (sourceRows === null) return;
  for (let i = 0; i < frame.rowIndex.length; i++) {
    const local = frame.rowIndex[i]!;
    if (local !== NO_ROW) frame.rowIndex[i] = sourceRows[local]!;
  }
}
