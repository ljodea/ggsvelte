import {
  parseTemporalColumn,
  type PositionScaleSpec,
  type TemporalDecision,
  type TemporalParserSpec,
} from "@ggsvelte/spec";

import { cellsToNumeric, type CellValue, type ParsedColumnOptions } from "../table.js";

export interface PositionConversionContext {
  /** Effective parser for detached/post-stat values and author scalars. */
  parser: TemporalParserSpec | "auto";
  /** Original parser request for source ColumnTable views and cache identity. */
  sourceParser: TemporalParserSpec | "auto";
  options: ParsedColumnOptions;
  requestedTime: boolean;
}

export const AUTO_POSITION_CONVERSION: PositionConversionContext = Object.freeze({
  parser: "auto",
  sourceParser: "auto",
  options: Object.freeze({}),
  requestedTime: false,
});

export function xConversionOf(binding: {
  xConversion?: PositionConversionContext | undefined;
}): PositionConversionContext {
  return binding.xConversion ?? AUTO_POSITION_CONVERSION;
}

export function yConversionOf(binding: {
  yConversion?: PositionConversionContext | undefined;
}): PositionConversionContext {
  return binding.yConversion ?? AUTO_POSITION_CONVERSION;
}

export interface ConvertedPositionValues {
  values: Float64Array;
  decision: TemporalDecision;
}

export function positionValuesToNumeric(
  values: readonly CellValue[],
  conversion: PositionConversionContext,
): ConvertedPositionValues {
  const parsed = parseTemporalColumn(values, conversion.parser, {
    ...(conversion.options.timezone !== undefined && {
      timezone: conversion.options.timezone,
    }),
    ...(conversion.options.disambiguation !== undefined && {
      disambiguation: conversion.options.disambiguation,
    }),
  });
  const temporal = conversion.parser !== "auto" || parsed.decision.status === "temporal";
  const numeric = temporal ? parsed.semantic.slice() : cellsToNumeric(values);
  if (temporal) {
    // Stats, trained domains, annotations, and public axis formatters may
    // already hold semantic epoch milliseconds. A concrete source parser is
    // for source-shaped strings; it must not reject finite semantic numbers.
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (
        typeof value === "number" &&
        Number.isFinite(value) &&
        !Number.isFinite(numeric[index]!)
      ) {
        numeric[index] = value;
      }
    }
  }
  return { values: numeric, decision: parsed.decision };
}

export function positionValueToNumber(
  value: CellValue,
  conversion: PositionConversionContext,
): number {
  return positionValuesToNumeric([value], conversion).values[0] ?? Number.NaN;
}

export function positionConversionContext(
  config: PositionScaleSpec | undefined,
): PositionConversionContext {
  if (config === undefined || config.type === "band") return AUTO_POSITION_CONVERSION;
  return {
    parser: config.parse ?? "auto",
    sourceParser: config.parse ?? "auto",
    options: {
      ...(config.timezone !== undefined && { timezone: config.timezone }),
      ...(config.disambiguation !== undefined && {
        disambiguation: config.disambiguation,
      }),
      ...(config.parseFailure !== undefined && { failurePolicy: config.parseFailure }),
    },
    requestedTime:
      config.type === "time" || config.parse !== undefined || config.temporalKind !== undefined,
  };
}
