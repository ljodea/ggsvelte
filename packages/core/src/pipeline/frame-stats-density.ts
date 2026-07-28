/**
 * Density stat → LayerFrame (area from zero baseline).
 */
import { statDensity } from "../stats/density.js";
import type { ColumnTable } from "../table.js";
import { scaleTransform } from "../scales/transform.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { transformedZeroBaseline } from "./position-baseline.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildDensityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statDensity({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    groups,
    weights: binding.weightField === null ? null : table.numeric(binding.weightField),
    carried,
    params: (layer.params ?? {}) as { bw?: number; adjust?: number; n?: number; cut?: number },
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "density-group-dropped",
      message: `Layer ${index} (density): ${result.droppedGroups} group(s) with fewer than two data points have been dropped.`,
    });
  }
  const columns: Record<string, Float64Array> = {
    density: result.density,
    count: result.count,
    scaled: result.scaled,
    ndensity: result.ndensity,
  };
  const outN = result.x.length;
  const yNumeric = forwardMeasureOnce(
    columns[binding.yStatColumn ?? "density"] ?? result.density,
    binding.yTransform,
  );
  return statLayerFrame({
    binding,
    table,
    n: outN,
    x: { numeric: result.x },
    y: { numeric: yNumeric },
    groups: result.groups,
    inputGroups: groups,
    columns,
    columnOf: columnOf(result, null),
    lineage: "none",
    afterStatColor: true,
    extras: {
      // Density renders as an area from the shared transformed-origin baseline.
      ymin: Float64Array.from({ length: outN }, () =>
        transformedZeroBaseline(binding.yTransform?.transform ?? scaleTransform("identity")),
      ),
      ymax: yNumeric,
    },
  });
}
