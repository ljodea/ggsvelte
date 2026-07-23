/**
 * Density/smooth/boxplot channel-type contracts for bindLayer.
 */
import type { LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { positionFieldType, type PositionConversionContext } from "./temporal-position.js";
import { PipelineError } from "./types.js";

export function validateGeomChannelTypeContracts(input: {
  layer: LayerSpec;
  index: number;
  table: ColumnTable;
  xField: string | null;
  yField: string | null;
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}): void {
  const { layer, index, table, xField, yField, xConversion, yConversion } = input;
  const geom = layer.geom;

  if (
    geom === "density" &&
    xField !== null &&
    positionFieldType(table, xField, xConversion) === "nominal"
  ) {
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
      const conversion = channel === "x" ? xConversion : yConversion;
      if (field !== null && positionFieldType(table, field, conversion) === "nominal") {
        throw new PipelineError(
          "channel-type-mismatch",
          `/layers/${index}/aes/${channel}`,
          `The smooth stat needs quantitative x and y, but field "${field}" (${channel}) is nominal.`,
        );
      }
    }
  }
  if (geom === "boxplot") {
    if (xField !== null && positionFieldType(table, xField, xConversion) !== "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The boxplot geom needs a DISCRETE x this milestone, but field "${xField}" is ${positionFieldType(table, xField, xConversion)}. Map x to a categorical field.`,
      );
    }
    if (yField !== null && positionFieldType(table, yField, yConversion) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/y`,
        `The boxplot stat needs a quantitative y, but field "${yField}" is nominal.`,
      );
    }
  }
  if (geom === "raster") {
    if (xField !== null && positionFieldType(table, xField, xConversion) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The raster geom needs continuous x, but field "${xField}" is nominal. Use geom "tile" for discrete axes.`,
      );
    }
    if (yField !== null && positionFieldType(table, yField, yConversion) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/y`,
        `The raster geom needs continuous y, but field "${yField}" is nominal. Use geom "tile" for discrete axes.`,
      );
    }
  }
}
