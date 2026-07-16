/**
 * Geom/stat structural validation for bindLayer (rule forms, type mismatches,
 * required channels, color-on-fill warnings).
 */
import type { Aes, BarParams, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { requireField } from "./bind-layer-helpers.js";
import type { ColorBinding, PipelineWarning, RuleForm } from "./types.js";
import { PipelineError } from "./types.js";

export function resolveRuleForm(layer: LayerSpec, index: number): RuleForm | null {
  if (layer.geom !== "rule") return null;
  const aes: Aes = layer.aes ?? {};
  const params = layer.params ?? {};
  const p = params as { xintercept?: unknown; yintercept?: unknown };
  const hasIntercepts = p.xintercept !== undefined || p.yintercept !== undefined;
  const xMapped = aes.x !== undefined && aes.x !== null;
  const yMapped = aes.y !== undefined && aes.y !== null;
  if (hasIntercepts && (xMapped || yMapped)) {
    throw new PipelineError(
      "rule-form-ambiguous",
      `/layers/${index}`,
      "This rule layer mixes the annotation form (params.xintercept/yintercept) with mapped aes.x/aes.y. Use fixed intercepts OR a data mapping, never both.",
    );
  }
  if (!hasIntercepts && !xMapped && !yMapped) {
    throw new PipelineError(
      "rule-form-missing",
      `/layers/${index}`,
      "This rule layer has neither fixed intercepts (params.xintercept/yintercept) nor a mapped aes.x/aes.y — nothing to draw.",
    );
  }
  if (!hasIntercepts && xMapped && yMapped) {
    throw new PipelineError(
      "rule-both-axes",
      `/layers/${index}`,
      "This rule layer maps BOTH aes.x and aes.y; a data-driven rule is either vertical (map x) or horizontal (map y). Unset the other channel with null.",
    );
  }
  return hasIntercepts ? "annotation" : xMapped ? "vertical" : "horizontal";
}

export function validateGeomStatContracts(input: {
  layer: LayerSpec;
  index: number;
  table: ColumnTable;
  xField: string | null;
  yField: string | null;
}): void {
  const { layer, index, table, xField, yField } = input;
  const geom = layer.geom;
  const stat = layer.stat ?? "identity";
  const params = layer.params ?? {};

  if (geom === "bar" && yField !== null) {
    throw new PipelineError(
      "computed-y-mapped",
      `/layers/${index}/aes/y`,
      `The bar geom computes y with the ${stat} stat, so aes.y must not map data. Use geom "col" for pre-computed heights.`,
    );
  }
  if (geom === "density" && yField !== null) {
    throw new PipelineError(
      "computed-y-mapped",
      `/layers/${index}/aes/y`,
      "The density geom computes y with the density stat, so aes.y must not map data. Map only x.",
    );
  }
  if (stat === "bin") {
    const p = params as BarParams;
    if (p.center !== undefined && p.boundary !== undefined) {
      throw new PipelineError(
        "bin-center-and-boundary",
        `/layers/${index}/params`,
        "The bin stat accepts params.center OR params.boundary (both align the bin grid), never both.",
      );
    }
    if (xField !== null && table.fieldType(xField) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The bin stat needs a continuous x, but field "${xField}" is nominal. Use geom "bar" (the count stat) to count categories instead.`,
      );
    }
  }
  if (geom === "density" && xField !== null && table.fieldType(xField) === "nominal") {
    throw new PipelineError(
      "channel-type-mismatch",
      `/layers/${index}/aes/x`,
      `The density stat needs a continuous x, but field "${xField}" is nominal. Use geom "bar" (the count stat) to count categories instead.`,
    );
  }
  if (geom === "smooth") {
    for (const [channel, field] of [
      ["x", xField],
      ["y", yField],
    ] as const) {
      if (field !== null && table.fieldType(field) === "nominal") {
        throw new PipelineError(
          "channel-type-mismatch",
          `/layers/${index}/aes/${channel}`,
          `The smooth stat needs quantitative x and y, but field "${field}" (${channel}) is nominal.`,
        );
      }
    }
  }
  if (geom === "boxplot") {
    if (xField !== null && table.fieldType(xField) !== "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The boxplot geom needs a DISCRETE x this milestone, but field "${xField}" is ${table.fieldType(xField)}. Map x to a categorical field.`,
      );
    }
    if (yField !== null && table.fieldType(yField) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/y`,
        `The boxplot stat needs a quantitative y, but field "${yField}" is nominal.`,
      );
    }
  }
}

export function assertRequiredChannels(input: {
  geom: string;
  stat: string;
  index: number;
  ruleForm: RuleForm | null;
  xField: string | null;
  yField: string | null;
  yStatColumn: string | null;
  yminField: string | null;
  ymaxField: string | null;
}): void {
  const { geom, stat, index, ruleForm, xField, yField, yStatColumn, yminField, ymaxField } = input;

  if (
    geom === "point" ||
    geom === "line" ||
    geom === "col" ||
    geom === "area" ||
    geom === "text" ||
    geom === "smooth" ||
    geom === "boxplot"
  ) {
    requireField(xField, "x", index, geom);
    if (yStatColumn === null) requireField(yField, "y", index, geom);
  }
  if (geom === "bar" || geom === "density") requireField(xField, "x", index, geom);
  if (geom === "errorbar") {
    requireField(xField, "x", index, geom);
    if (stat === "summary") {
      requireField(yField, "y", index, geom);
    } else {
      requireField(yminField, "ymin", index, geom);
      requireField(ymaxField, "ymax", index, geom);
    }
  }
  if (geom === "rule" && ruleForm === "vertical") requireField(xField, "x", index, geom);
  if (geom === "rule" && ruleForm === "horizontal") requireField(yField, "y", index, geom);
}

export function applyColorOnFillGeomWarning(
  geom: string,
  index: number,
  color: ColorBinding,
  warnings: PipelineWarning[],
): void {
  if (
    (geom === "bar" ||
      geom === "col" ||
      geom === "area" ||
      geom === "boxplot" ||
      geom === "density") &&
    (color.field !== null || color.constant !== null || color.scaledConstant !== null)
  ) {
    warnings.push({
      code: "color-on-fill-geom",
      message: `Layer ${index} (${geom}): the color channel styles OUTLINES, which this geom does not support as a data channel yet — map "fill" instead. The color mapping is ignored.`,
    });
    color.field = null;
    color.constant = null;
    color.scaledConstant = null;
  }
}
