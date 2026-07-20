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
  color: LayerBinding["color"];
  fill: LayerBinding["fill"];
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
    color: input.color,
    fill: input.fill,
    labelField: input.labelField,
    labelConstant: input.labelConstant,
    weightField: input.weightField,
    ruleForm: input.ruleForm,
  };
}
