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
import { PipelineError } from "./types.js";

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

  // A fixed-intercept annotation rule emits no data rows, so a field- or
  // after-stat-mapped style has nothing to map — the packer would produce NaN
  // or invalid style vectors. Reject it here (scaled/literal constants are
  // still fine). Compatibility with the rule geom is enforced upstream, so only
  // linewidth/linetype/alpha realistically reach this guard.
  if (position.ruleForm === "annotation") {
    const styleBindings = {
      size: extras.size,
      linewidth: extras.linewidth,
      alpha: extras.alpha,
      shape: extras.shape,
      linetype: extras.linetype,
    } as const;
    for (const channelName of Object.keys(styleBindings) as (keyof typeof styleBindings)[]) {
      const style = styleBindings[channelName];
      if (style.field !== null || style.statColumn !== null) {
        throw new PipelineError(
          "unsupported-annotation-style",
          `/layers/${String(index)}/aes/${channelName}`,
          `A fixed-intercept ${layer.geom} annotation has no data rows, so aes.${channelName} cannot map a field or after-stat column. Use a constant value (optionally { value, scale: true }).`,
        );
      }
    }
  }

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
    size: extras.size,
    linewidth: extras.linewidth,
    alpha: extras.alpha,
    shape: extras.shape,
    linetype: extras.linetype,
    labelField: extras.labelField,
    labelConstant: extras.labelConstant,
    weightField: extras.weightField,
    ruleForm: position.ruleForm,
  });
}
