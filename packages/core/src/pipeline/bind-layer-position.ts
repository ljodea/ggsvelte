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
import { positionFieldType, type PositionConversionContext } from "./temporal-position.js";
import type { LayerBinding, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

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
  xminField: string | null;
  xmaxField: string | null;
  widthField: string | null;
  heightField: string | null;
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
  const xminField = checkField(aes.xmin, "xmin", index, table, warnings);
  const xmaxField = checkField(aes.xmax, "xmax", index, table, warnings);
  const widthField = checkField(aes.width, "width", index, table, warnings);
  const heightField = checkField(aes.height, "height", index, table, warnings);
  // Constant size channels ({ value }) are not field-mapped — fold into params.
  if (geom === "tile") {
    const params = { ...layer.params } as Record<string, unknown>;
    let mutated = false;
    for (const channel of ["width", "height"] as const) {
      const mapping = aes[channel];
      if (mapping === undefined || mapping === null || !("value" in mapping)) continue;
      if (mapping.scale === true) {
        throw new PipelineError(
          "unsupported-param",
          `/layers/${index}/aes/${channel}`,
          `Tile aes.${channel} does not support { value, scale: true }; use params.${channel} or a field mapping.`,
        );
      }
      const value = mapping.value;
      if (typeof value !== "number" || !(value > 0) || !Number.isFinite(value)) {
        throw new PipelineError(
          "tile-nonpositive-size",
          `/layers/${index}/aes/${channel}`,
          `The tile geom requires positive finite ${channel}; got ${String(value)}.`,
        );
      }
      if (params[channel] === undefined) {
        params[channel] = value;
        mutated = true;
      }
    }
    if (mutated) {
      (layer as { params?: Record<string, unknown> }).params = params;
    }
  }

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
    xminField,
    xmaxField,
  });

  // Rect edges must be continuous (band endpoints silently drop every row).
  if (geom === "rect") {
    for (const [channel, field, conversion] of [
      ["xmin", xminField, xConversion],
      ["xmax", xmaxField, xConversion],
      ["ymin", yminField, yConversion],
      ["ymax", ymaxField, yConversion],
    ] as const) {
      if (field === null) continue;
      const fieldType = positionFieldType(table, field, conversion);
      if (fieldType === "nominal") {
        throw new PipelineError(
          "channel-type-mismatch",
          `/layers/${index}/aes/${channel}`,
          `The rect geom needs quantitative edges, but field "${field}" (${channel}) is nominal.`,
        );
      }
    }
  }

  return {
    ruleForm,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
    xminField,
    xmaxField,
    widthField,
    heightField,
  };
}
