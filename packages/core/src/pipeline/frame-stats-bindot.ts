/**
 * bindot (geom_dotplot histodot) → LayerFrame of stacked points (#803).
 */
import type { ColumnTable } from "../table.js";

import { statBindot, type BindotParamsInput } from "../stats/bindot.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import { positionColumn } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildBindotFrame(
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
  const result = statBindot({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    groups,
    carried,
    params: (layer.params ?? {}) as BindotParamsInput,
    ...(binRange !== undefined && { range: binRange }),
  });
  removedStatWarning(result.dropped, index, "missing, non-finite, or out-of-range x", warnings);
  if (result.usedDefaultBins && result.x.length > 0) {
    advisories.push({
      code: "bin-default-bins",
      path: `layers.${index}`,
      chosen: "stat bindot using bins = 30",
      howToOverride: `Set params.binwidth (preferred) or params.bins on layer ${index}.`,
    });
  }

  const columns: Record<string, Float64Array> = {
    stackpos: result.stackpos,
    count: result.count,
  };
  const col = columnOf(result, null);
  const outN = result.x.length;
  const yNumeric = forwardMeasureOnce(
    columns[binding.yStatColumn ?? "stackpos"] ?? result.stackpos,
    binding.yTransform,
  );

  // Per-observation aesthetics from source rows (not group-constant only).
  const colorField = binding.color.field;
  const fillField = binding.fill.field;
  const colorValues =
    colorField === null ? null : result.sourceRows.map((row) => table.column(colorField)[row]!);
  const fillValues =
    fillField === null ? null : result.sourceRows.map((row) => table.column(fillField)[row]!);

  return {
    binding,
    table,
    n: outN,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from(result.sourceRows),
    colorValues: colorField === null ? col(null) : colorValues,
    fillValues: fillField === null ? col(null) : fillValues,
    ...styleColumns(binding, col, columns),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    xmin: result.xmin,
    xmax: result.xmax,
  };
}
