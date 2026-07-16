/**
 * Per-layer aes channel resolution and structural geom/stat validation.
 */
import type { Aes, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { STAT_Y_COLUMNS, checkField, colorBinding } from "./bind-layer-helpers.js";
import {
  applyColorOnFillGeomWarning,
  assertRequiredChannels,
  resolveRuleForm,
  validateGeomStatContracts,
} from "./bind-layer-validate.js";
import type { LayerBinding, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

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
  let yField: string | null = null;
  let yStatColumn: string | null = null;
  const y = aes.y;
  if (y !== undefined && y !== null && "stat" in y) {
    const generated = STAT_Y_COLUMNS[stat] ?? [];
    if (!generated.includes(y.stat)) {
      throw new PipelineError(
        "unknown-stat-column",
        `/layers/${index}/aes/y`,
        `Channel "y" maps stat column "${y.stat}", but this layer's stat ("${stat}") ${generated.length > 0 ? `generates: ${generated.join(", ")}` : "generates no y-mappable columns"}.`,
      );
    }
    yStatColumn = y.stat;
  } else {
    yField = checkField(y, "y", index, table, warnings);
  }

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

  // --- label / weight ----------------------------------------------------------
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
  if (weightField !== null && (stat === "boxplot" || stat === "smooth" || stat === "summary")) {
    warnings.push({
      code: "weight-unsupported",
      message: `Layer ${index}: the ${stat} stat does not support aes.weight; the weight mapping is ignored.`,
    });
  }

  return {
    layer,
    index,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
    color,
    fill,
    labelField,
    labelConstant,
    weightField,
    ruleForm,
  };
}
