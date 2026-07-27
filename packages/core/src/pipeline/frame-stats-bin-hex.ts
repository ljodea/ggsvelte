/**
 * bin_hex stat → LayerFrame for hex polygon geometry.
 */
import type { CellValue, ColumnTable } from "../table.js";

import { statBinHex } from "../stats/bin-hex.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildBinHexFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as { bins?: number; drop?: boolean };
  const result = statBinHex({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    weights: binding.weightField === null ? null : table.numeric(binding.weightField),
    carried,
    params,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before bin_hex", warnings);
  if (result.usedDefaultBins && result.x.length > 0) {
    advisories.push({
      code: "bin-default-bins",
      path: `layers.${index}`,
      chosen: "stat bin_hex using bins = 30",
      howToOverride: `Set params.bins on layer ${index}.`,
    });
  }

  const columns: Record<string, Float64Array> = {
    count: result.count,
    density: result.density,
    ncount: result.ncount,
    ndensity: result.ndensity,
    width: result.width,
    height: result.height,
  };
  const col = columnOf(result, null);

  let fillValues: readonly CellValue[] | null = null;
  const fillStat = binding.fill.statColumn ?? null;
  if (fillStat === null) {
    fillValues = col(binding.fill.field);
  } else {
    const series = columns[fillStat] ?? result.count;
    fillValues = Array.from(series, (v) => v as CellValue);
  }

  // Outline colour: resolve after_stat the same way as fill (bin_hex publishes
  // count/density/… in STAT_COLOR_COLUMNS; field-only would drop color: {stat}).
  let colorValues: readonly CellValue[] | null = null;
  const colorStat = binding.color.statColumn ?? null;
  if (colorStat === null) {
    colorValues = col(binding.color.field);
  } else {
    const series = columns[colorStat] ?? result.count;
    colorValues = Array.from(series, (v) => v as CellValue);
  }

  return {
    binding,
    table,
    n: result.x.length,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric: result.y,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues,
    fillValues,
    ...styleColumns(binding, col, columns),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    hexWidth: result.width,
    hexHeight: result.height,
  };
}
