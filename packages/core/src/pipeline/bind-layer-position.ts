/**
 * Resolve positional channels (x/y/ymin/ymax) and validate geom/stat contracts.
 */
import type { Aes, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { checkField } from "./bind-layer-helpers.js";
import {
  assertRequiredChannels,
  resolveRuleForm,
  validateGeomStatContracts,
} from "./bind-layer-validate.js";
import { resolveYChannel } from "./bind-layer-y.js";
import type { PositionConversionContext } from "./temporal-position.js";
import type { LayerBinding, PipelineWarning } from "./types.js";

export function resolveLayerPositionChannels(input: {
  layer: LayerSpec;
  aes: Aes;
  index: number;
  table: ColumnTable;
  warnings: PipelineWarning[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}): {
  ruleForm: LayerBinding["ruleForm"];
  xField: string | null;
  yField: string | null;
  yStatColumn: string | null;
  yminField: string | null;
  ymaxField: string | null;
} {
  const { layer, aes, index, table, warnings, xConversion, yConversion } = input;
  const geom = layer.geom;
  const ruleForm = resolveRuleForm(layer, index);
  const stat = layer.stat ?? "identity";
  const xField = checkField(aes.x, "x", index, table, warnings);
  const { yField, yStatColumn } = resolveYChannel({ aes, stat, index, table, warnings });

  validateGeomStatContracts({
    layer,
    index,
    table,
    xField,
    yField,
    xConversion,
    yConversion,
  });

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

  return { ruleForm, xField, yField, yStatColumn, yminField, ymaxField };
}
