/**
 * Summary stat → LayerFrame (y/ymin/ymax for errorbars and related geoms).
 */
import type { ErrorbarParams } from "@ggsvelte/spec";

import { statSummary } from "../stats/summary.js";
import { ColumnTable, type CellValue } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import {
  makeColumnOf,
  shouldAggregateOnSemanticTemporalX,
  styleColumns,
} from "./frame-stats-shared.js";
import { positionColumn, positionValuesToNumeric } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildSummaryFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as ErrorbarParams;
  const xField = binding.xField!;
  const parsedX = table.parsed(
    xField,
    binding.xConversion.sourceParser,
    binding.xConversion.options,
  );
  const temporalX = shouldAggregateOnSemanticTemporalX(binding, parsedX.decision.status);
  const transformedContinuousX =
    !temporalX && binding.xTransform !== undefined
      ? positionColumn(table, xField, binding.xConversion, binding.xTransform)
      : null;
  const summaryX: readonly (CellValue | null)[] = temporalX
    ? Array.from(parsedX.semantic, (value, row) => (parsedX.valid[row] === 1 ? value : null))
    : transformedContinuousX === null
      ? table.column(xField)
      : Array.from(transformedContinuousX, (value) => (Number.isFinite(value) ? value : null));
  const result = statSummary({
    x: summaryX,
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    fun: params.fun,
    funMin: params.funMin,
    funMax: params.funMax,
    carried,
  });
  removedStatWarning(result.dropped, index, "missing x or non-finite y", warnings);
  const displayX: CellValue[] =
    transformedContinuousX === null
      ? result.x
      : result.x.map((value) => binding.xTransform!.transform.inverse(value as number));
  const col = columnOf(result, displayX);
  return {
    binding,
    table,
    n: result.x.length,
    xValues: displayX,
    xNumeric:
      temporalX || transformedContinuousX !== null
        ? Float64Array.from(result.x, (value) => (typeof value === "number" ? value : Number.NaN))
        : positionValuesToNumeric(result.x, binding.xConversion).values,
    yValues: null,
    yNumeric: result.y,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, {
      y: result.y,
      ymin: result.ymin,
      ymax: result.ymax,
    }),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    ymin: result.ymin,
    ymax: result.ymax,
  };
}
