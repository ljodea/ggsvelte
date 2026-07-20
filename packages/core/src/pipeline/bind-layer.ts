/**
 * Per-layer aes channel resolution and structural geom/stat validation.
 */
import type { Aes, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { resolveLabelWeightColorFill } from "./bind-layer-extras.js";
import { resolveLayerPositionChannels } from "./bind-layer-position.js";
import { makeLayerBinding } from "./bind-layer-result.js";
import { AUTO_POSITION_CONVERSION, type PositionConversionContext } from "./temporal-position.js";
import type { LayerBinding, PipelineWarning } from "./types.js";

const DEFAULT_BIND_CONVERSIONS = Object.freeze({
  x: AUTO_POSITION_CONVERSION,
  y: AUTO_POSITION_CONVERSION,
});

export function bindLayer(
  layer: LayerSpec,
  index: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
  conversions: Readonly<{
    x: PositionConversionContext;
    y: PositionConversionContext;
  }> = DEFAULT_BIND_CONVERSIONS,
): LayerBinding {
  const aes: Aes = layer.aes ?? {};
  const position = resolveLayerPositionChannels({
    layer,
    aes,
    index,
    table,
    warnings,
    xConversion: conversions.x,
    yConversion: conversions.y,
  });
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
    xConversion: conversions.x,
    yConversion: conversions.y,
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
