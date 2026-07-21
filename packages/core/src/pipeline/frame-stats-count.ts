/**
 * Count stat → LayerFrame.
 */
import { statCount } from "../stats/count.js";
import { ColumnTable, type CellValue } from "../table.js";
import { scaleTransform } from "../scales/transform.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { binIdColumn } from "./binned-scale.js";
import { positionColumn, positionValuesToNumeric } from "./temporal-position.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

/**
 * Binned count: aggregate by STABLE INTEGER BIN ID (the discrete key), then
 * restore transformed bin centers (rendered `xNumeric`) and their semantic
 * inverse-center values (`xValues`, for tooltips/candidates) after counting.
 * Out-of-range rows (bin id −1) are dropped like any missing x.
 */
function binnedCountX(
  binding: LayerBinding,
  table: ColumnTable,
): { countX: (CellValue | null)[] } | null {
  if (binding.xBinning === undefined) return null;
  const transformed = positionColumn(
    table,
    binding.xField!,
    binding.xConversion,
    binding.xTransform,
  );
  const ids = binIdColumn(transformed, binding.xBinning);
  return { countX: Array.from(ids, (id) => (id < 0 ? null : id)) };
}

export function buildCountFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const xField = binding.xField!;
  const binned = binnedCountX(binding, table);
  const parsedX = table.parsed(
    xField,
    binding.xConversion.sourceParser,
    binding.xConversion.options,
  );
  const temporalX =
    binned === null &&
    (binding.xConversion.sourceParser !== "auto" || parsedX.decision.status === "temporal");
  const countX: readonly (CellValue | null)[] =
    binned === null
      ? temporalX
        ? Array.from(parsedX.semantic, (value, row) => (parsedX.valid[row] === 1 ? value : null))
        : table.column(xField)
      : binned.countX;
  const result = statCount({
    x: countX,
    groups,
    weights: binding.weightField === null ? null : table.numeric(binding.weightField),
    carried,
  });
  removedStatWarning(
    result.dropped,
    index,
    "missing x or non-finite weight before counting",
    warnings,
  );

  // Binned: result.x holds bin ids; restore transformed centers (rendered) and
  // semantic inverse-center values (tooltip/candidate), and retain the bin ids.
  const centers = binding.xBinning?.centers;
  const xInverse = binding.xTransform?.transform ?? scaleTransform("identity");
  const displayX: CellValue[] =
    binned === null ? result.x : result.x.map((id) => xInverse.inverse(centers![id as number]!));
  const col = columnOf(result, displayX);
  return {
    binding,
    table,
    n: result.x.length,
    xValues: displayX,
    xNumeric:
      binned === null
        ? temporalX
          ? Float64Array.from(result.x, (value) => (typeof value === "number" ? value : Number.NaN))
          : positionValuesToNumeric(result.x, binding.xConversion).values
        : Float64Array.from(result.x, (id) => centers![id as number]!),
    yValues: null,
    yNumeric:
      binding.yStatColumn === "count" ? forwardMeasureOnce(result.count, binding.yTransform) : null,
    groups: result.groups,
    inputGroups: groups,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    xBinId: binned === null ? null : Int32Array.from(result.x, (id) => id as number),
  };
}
