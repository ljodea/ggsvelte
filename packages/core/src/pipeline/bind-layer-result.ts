/**
 * Assemble LayerBinding from resolved channel fields and extras.
 */
import type { LayerSpec } from "@ggsvelte/spec";

import type { LayerBinding } from "./types.js";

export function makeLayerBinding(input: {
  layer: LayerSpec;
  index: number;
  xField: string | null;
  yField: string | null;
  yStatColumn: string | null;
  xConversion: LayerBinding["xConversion"];
  yConversion: LayerBinding["yConversion"];
  yminField: string | null;
  ymaxField: string | null;
  xminField: string | null;
  xmaxField: string | null;
  ribbonOrientation?: "x" | "y";
  color: LayerBinding["color"];
  fill: LayerBinding["fill"];
  size: LayerBinding["size"];
  linewidth: LayerBinding["linewidth"];
  alpha: LayerBinding["alpha"];
  shape: LayerBinding["shape"];
  linetype: LayerBinding["linetype"];
  labelField: string | null;
  labelConstant: string | null;
  weightField: string | null;
  ruleForm: LayerBinding["ruleForm"];
}): LayerBinding {
  return {
    layer: input.layer,
    index: input.index,
    xField: input.xField,
    yField: input.yField,
    yStatColumn: input.yStatColumn,
    xConversion: input.xConversion,
    yConversion: input.yConversion,
    yminField: input.yminField,
    ymaxField: input.ymaxField,
    xminField: input.xminField,
    xmaxField: input.xmaxField,
    ...(input.ribbonOrientation !== undefined && { ribbonOrientation: input.ribbonOrientation }),
    color: input.color,
    fill: input.fill,
    size: input.size,
    linewidth: input.linewidth,
    alpha: input.alpha,
    shape: input.shape,
    linetype: input.linetype,
    labelField: input.labelField,
    labelConstant: input.labelConstant,
    weightField: input.weightField,
    ruleForm: input.ruleForm,
  };
}
