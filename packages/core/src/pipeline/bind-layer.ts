/**
 * Per-layer aes channel resolution and structural geom/stat validation.
 */
import type { Aes, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { checkField } from "./bind-layer-helpers.js";
import { resolveLabelWeightColorFill } from "./bind-layer-extras.js";
import {
  assertRequiredChannels,
  resolveRuleForm,
  validateGeomStatContracts,
} from "./bind-layer-validate.js";
import { resolveYChannel } from "./bind-layer-y.js";
import type { LayerBinding, PipelineWarning } from "./types.js";

export function bindLayer(
  layer: LayerSpec,
  index: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): LayerBinding {
  const aes: Aes = layer.aes ?? {};
  const geom = layer.geom;

  const ruleForm = resolveRuleForm(layer, index);

  const stat = layer.stat ?? "identity";
  const xField = checkField(aes.x, "x", index, table, warnings);
  const { yField, yStatColumn } = resolveYChannel({ aes, stat, index, table, warnings });

  validateGeomStatContracts({ layer, index, table, xField, yField });

  // --- ymin/ymax (errorbar identity form) --------------------------------------
  const yminField = checkField(aes.ymin, "ymin", index, table, warnings);
  const ymaxField = checkField(aes.ymax, "ymax", index, table, warnings);

  assertRequiredChannels({
    geom,
    stat,
    index,
    ruleForm,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
  });

  const extras = resolveLabelWeightColorFill({ aes, geom, stat, index, table, warnings });

  return {
    layer,
    index,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
    color: extras.color,
    fill: extras.fill,
    labelField: extras.labelField,
    labelConstant: extras.labelConstant,
    weightField: extras.weightField,
    ruleForm,
  };
}
