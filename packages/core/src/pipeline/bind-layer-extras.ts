/**
 * Label, weight, and color/fill resolution after required-channel checks.
 */
import type { Aes, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { checkField, colorBinding } from "./bind-layer-helpers.js";
import { styleBinding } from "./bind-layer-style-binding.js";
import { applyColorOnFillGeomWarning } from "./bind-layer-validate.js";
import type { ColorBinding, PipelineWarning, StyleBinding } from "./types.js";
import { PipelineError } from "./types.js";

export function resolveLabelWeightColorFill(input: {
  aes: Aes;
  geom: LayerSpec["geom"];
  stat: string;
  index: number;
  table: ColumnTable;
  warnings: PipelineWarning[];
}): {
  labelField: string | null;
  labelConstant: string | null;
  weightField: string | null;
  color: ColorBinding;
  fill: ColorBinding;
  size: StyleBinding;
  linewidth: StyleBinding;
  alpha: StyleBinding;
  shape: StyleBinding;
  linetype: StyleBinding;
} {
  const { aes, geom, stat, index, table, warnings } = input;

  let labelField: string | null = null;
  let labelConstant: string | null = null;
  const label = aes.label;
  if (label !== undefined && label !== null) {
    if ("field" in label) labelField = checkField(label, "label", index, table, warnings);
    else if ("value" in label) labelConstant = String(label.value);
  }
  if (geom === "text" && labelField === null && labelConstant === null) {
    throw new PipelineError(
      "missing-channel",
      `/layers/${index}/aes/label`,
      'The text geom requires a "label" channel (map it with aes).',
    );
  }
  const weightField = checkField(aes.weight, "weight", index, table, warnings);

  const color = colorBinding(aes.color, "color", index, table, warnings);
  const fill = colorBinding(aes.fill, "fill", index, table, warnings);
  applyColorOnFillGeomWarning(geom, index, color, warnings);
  const size = styleBinding(aes.size, "size", geom, stat, index, table, warnings);
  const linewidth = styleBinding(aes.linewidth, "linewidth", geom, stat, index, table, warnings);
  const alpha = styleBinding(aes.alpha, "alpha", geom, stat, index, table, warnings);
  const shape = styleBinding(aes.shape, "shape", geom, stat, index, table, warnings);
  const linetype = styleBinding(aes.linetype, "linetype", geom, stat, index, table, warnings);
  if (weightField !== null && (stat === "boxplot" || stat === "smooth" || stat === "summary")) {
    warnings.push({
      code: "weight-unsupported",
      message: `Layer ${index}: the ${stat} stat does not support aes.weight; the weight mapping is ignored.`,
    });
  }

  return {
    labelField,
    labelConstant,
    weightField,
    color,
    fill,
    size,
    linewidth,
    alpha,
    shape,
    linetype,
  };
}
