/**
 * Computed-y and bin-param contracts for bindLayer.
 */
import type { BarParams, LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import type { PositionConversionContext } from "./temporal-position.js";
import { PipelineError } from "./types.js";

export function validateComputedYAndBinContracts(input: {
  layer: LayerSpec;
  index: number;
  table: ColumnTable;
  xField: string | null;
  yField: string | null;
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}): void {
  const { layer, index, table, xField, yField, xConversion } = input;
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
    if (
      xField !== null &&
      table.fieldType(xField, xConversion.sourceParser, xConversion.options) === "nominal"
    ) {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The bin stat needs a continuous x, but field "${xField}" is nominal. Use geom "bar" (the count stat) to count categories instead.`,
      );
    }
  }
}
