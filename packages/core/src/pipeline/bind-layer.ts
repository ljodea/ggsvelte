/**
 * Per-layer aes channel resolution and structural geom/stat validation.
 */
import type { Aes, BarParams, ChannelValue, LayerSpec } from "@ggsvelte/spec";
import { didYouMean } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import type { ColorBinding, LayerBinding, PipelineWarning, RuleForm } from "./types.js";
import { PipelineError } from "./types.js";

/** y-channel { stat } columns each stat exposes (module-header contracts). */
const STAT_Y_COLUMNS: Record<string, readonly string[]> = {
  identity: [],
  count: ["count"],
  bin: ["count", "density", "ncount", "ndensity"],
  density: ["density", "count", "scaled", "ndensity"],
  smooth: [],
  boxplot: [],
  summary: [],
};

function checkField(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): string | null {
  if (channel === undefined || channel === null) return null;
  if (!("field" in channel)) return null;
  if (!table.has(channel.field)) {
    const suggestion = didYouMean(channel.field, table.fields);
    throw new PipelineError(
      "unknown-field",
      `/layers/${layerIndex}/aes/${channelName}`,
      `Unknown field "${channel.field}" (available: ${table.fields.join(", ") || "none"}).` +
        (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    );
  }
  if (allNull(table.column(channel.field))) {
    throw new PipelineError(
      "all-null-column",
      `/layers/${layerIndex}/aes/${channelName}`,
      `Field "${channel.field}" contains only null values; the "${channelName}" channel cannot be drawn from it.`,
    );
  }
  void warnings;
  return channel.field;
}

function allNull(column: readonly CellValue[]): boolean {
  if (column.length === 0) return false;
  for (const v of column) if (v !== null) return false;
  return true;
}

function requireField(
  field: string | null,
  channelName: string,
  layerIndex: number,
  geom: string,
): string {
  if (field === null) {
    throw new PipelineError(
      "missing-channel",
      `/layers/${layerIndex}/aes/${channelName}`,
      `The ${geom} geom requires a "${channelName}" channel (map it with aes).`,
    );
  }
  return field;
}

function colorBinding(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): ColorBinding {
  const out: ColorBinding = { field: null, constant: null, scaledConstant: null };
  if (channel === undefined || channel === null) return out;
  if ("field" in channel) {
    out.field = checkField(channel, channelName, layerIndex, table, warnings);
  } else if ("value" in channel) {
    if (channel.scale === true) out.scaledConstant = channel.value;
    else out.constant = String(channel.value);
  } else {
    warnings.push({
      code: "stat-channel-unsupported",
      message: `Layer ${layerIndex}: { stat } mappings on the "${channelName}" channel are not supported yet; the mapping is ignored.`,
    });
  }
  return out;
}

export function bindLayer(
  layer: LayerSpec,
  index: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): LayerBinding {
  const aes: Aes = layer.aes ?? {};
  const geom = layer.geom;
  const params = layer.params ?? {};

  // --- rule: two honest forms ------------------------------------------------
  let ruleForm: RuleForm | null = null;
  if (geom === "rule") {
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
    ruleForm = hasIntercepts ? "annotation" : xMapped ? "vertical" : "horizontal";
  }

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

  // --- ymin/ymax (errorbar identity form) --------------------------------------
  const yminField = checkField(aes.ymin, "ymin", index, table, warnings);
  const ymaxField = checkField(aes.ymax, "ymax", index, table, warnings);

  // --- required channels ------------------------------------------------------
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
