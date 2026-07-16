/**
 * Per-layer aes channel resolution and structural geom/stat validation.
 */
import type { Aes, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { resolveLabelWeightColorFill } from "./bind-layer-extras.js";
import { resolveLayerPositionChannels } from "./bind-layer-position.js";
import { makeLayerBinding } from "./bind-layer-result.js";
import type { LayerBinding, PipelineWarning } from "./types.js";

export function bindLayer(
  layer: LayerSpec,
  index: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): LayerBinding {
  const aes: Aes = layer.aes ?? {};
  const position = resolveLayerPositionChannels({ layer, aes, index, table, warnings });
  const extras = resolveLabelWeightColorFill({
    aes,
    geom: layer.geom,
    stat: layer.stat ?? "identity",
    index,
    table,
    warnings,
  });

  return makeLayerBinding({
    layer,
    index,
    xField: position.xField,
    yField: position.yField,
    yStatColumn: position.yStatColumn,
    yminField: position.yminField,
    ymaxField: position.ymaxField,
    color: extras.color,
    fill: extras.fill,
    labelField: extras.labelField,
    labelConstant: extras.labelConstant,
    weightField: extras.weightField,
    ruleForm: position.ruleForm,
  });
}
