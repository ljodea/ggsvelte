/**
 * Resolve positional channels (x/y/ymin/ymax/xmin/xmax) and validate geom/stat contracts.
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
import { PipelineError } from "./types.js";
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
  xminField: string | null;
  xmaxField: string | null;
  ribbonOrientation?: "x" | "y";
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

  const ribbonOrientation =
    geom === "ribbon"
      ? resolveRibbonOrientation({
          index,
          xField,
          yField,
          yminField,
          ymaxField,
          xminField,
          xmaxField,
          pinned: ribbonOrientationParam(layer.params),
        })
      : undefined;

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
    ...(ribbonOrientation !== undefined && { ribbonOrientation }),
  });

  return {
    ruleForm,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
    xminField,
    xmaxField,
    ...(ribbonOrientation !== undefined && { ribbonOrientation }),
  };
}

function ribbonOrientationParam(params: LayerSpec["params"]): "x" | "y" | undefined {
  if (params === undefined || params === null || typeof params !== "object") return undefined;
  const orientation = (params as Record<string, unknown>)["orientation"];
  return orientation === "x" || orientation === "y" ? orientation : undefined;
}

function resolveRibbonOrientation(input: {
  index: number;
  xField: string | null;
  yField: string | null;
  yminField: string | null;
  ymaxField: string | null;
  xminField: string | null;
  xmaxField: string | null;
  pinned: "x" | "y" | undefined;
}): "x" | "y" {
  const { index, xField, yField, yminField, ymaxField, xminField, xmaxField, pinned } = input;
  if (pinned === "x" || pinned === "y") return pinned;
  const xContract = xField !== null && yminField !== null && ymaxField !== null;
  const yContract = yField !== null && xminField !== null && xmaxField !== null;
  if (xContract && !yContract) return "x";
  if (yContract && !xContract) return "y";
  if (xContract && yContract) {
    throw new PipelineError(
      "ribbon-orientation-ambiguous",
      `/layers/${index}/params/orientation`,
      'This ribbon layer maps both x-orientation (x+ymin+ymax) and y-orientation (y+xmin+xmax) contracts. Set params.orientation to "x" or "y".',
    );
  }
  // Incomplete contracts: required-channel checks report missing fields.
  return xField !== null || yminField !== null || ymaxField !== null ? "x" : "y";
}
