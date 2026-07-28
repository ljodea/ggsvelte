/**
 * summary_bin → LayerFrame (bin centers + y/ymin/ymax; #817).
 *
 * Scale-space: x is binned in already-transformed units (like stat_bin).
 * y/ymin/ymax are not re-forwarded (summary values live in measure space).
 * Emits xmin/xmax for bin-edge interaction lineage.
 */
import type { ColumnTable } from "../table.js";

import { statSummaryBin, type SummaryBinParamsInput } from "../stats/summary-bin.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildSummaryBinFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statSummaryBin({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
    params: (layer.params ?? {}) as SummaryBinParamsInput,
    ...(binRange !== undefined && { range: binRange }),
  });
  removedStatWarning(
    result.dropped,
    index,
    "missing/non-finite x or y before summary_bin",
    warnings,
  );
  if (result.usedDefaultBins && result.x.length > 0) {
    advisories.push({
      code: "bin-default-bins",
      path: `layers.${index}`,
      chosen: "stat summary_bin using bins = 30",
      howToOverride: `Set params.binwidth (preferred) or params.bins on layer ${index}.`,
    });
  }
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups: groups,
    columns: {
      y: result.y,
      ymin: result.ymin,
      ymax: result.ymax,
    },
    columnOf: columnOf(result, null),
    lineage: "none",
    extras: {
      // Lineage replays the stat's own cut instead of re-deriving from edges (#905).
      binCut: result.cut,
      ymin: result.ymin,
      ymax: result.ymax,
      xmin: result.xmin,
      xmax: result.xmax,
    },
  });
}
