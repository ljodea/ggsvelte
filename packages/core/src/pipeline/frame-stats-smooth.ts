/**
 * Smooth stat → LayerFrame (fitted y with optional SE band).
 */
import type { SmoothParams } from "@ggsvelte/spec";

import { statSmooth } from "../stats/smooth.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { packSmoothLayerFrame } from "./frame-stats-smooth-frame.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildSmoothFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as SmoothParams;
  const result = statSmooth({
    x: table.numeric(
      binding.xField!,
      binding.xConversion.sourceParser,
      binding.xConversion.options,
    ),
    y: table.numeric(
      binding.yField!,
      binding.yConversion.sourceParser,
      binding.yConversion.options,
    ),
    groups,
    carried,
    params,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "smooth-group-dropped",
      message: `Layer ${index} (smooth): ${result.droppedGroups} group(s) too small or degenerate to fit have been dropped.`,
    });
  }
  if (result.methodInferred && result.x.length > 0) {
    advisories.push({
      code: "smooth-method-inferred",
      path: `layers.${index}`,
      chosen: `stat smooth using method = "${result.methodUsed}" (largest group ${result.methodUsed === "loess" ? "<" : ">="} 1000 rows; ggplot2 would escalate to gam, which ggsvelte does not ship)`,
      howToOverride: `Set params.method ("lm" | "loess") on layer ${index}.`,
    });
  }
  return packSmoothLayerFrame(binding, table, result, columnOf, groups);
}
