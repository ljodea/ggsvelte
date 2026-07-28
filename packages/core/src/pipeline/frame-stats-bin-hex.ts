/**
 * bin_hex stat → LayerFrame for hex polygon geometry.
 */
import type { ColumnTable } from "../table.js";

import { statBinHex } from "../stats/bin-hex.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

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

  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups: groups,
    columns,
    columnOf: columnOf(result, null),
    lineage: "none",
    afterStatColor: true,
    extras: {
      hexWidth: result.width,
      hexHeight: result.height,
    },
  });
}
