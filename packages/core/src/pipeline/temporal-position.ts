import {
  parseTemporalColumn,
  type PositionScaleSpec,
  type TemporalDecision,
  type TemporalParserSpec,
} from "@ggsvelte/spec";

import {
  cellsToNumeric,
  cellsToQuantitative,
  type CellValue,
  type ColumnTable,
  type Discreteness,
  type FieldType,
  type ParsedColumnOptions,
} from "../table.js";
import type { ColumnTransformConfig } from "../scales/transform.js";

export interface PositionConversionContext {
  /** Effective parser for detached/post-stat values and author scalars. */
  parser: TemporalParserSpec | "auto";
  /** Original parser request for source ColumnTable views and cache identity. */
  sourceParser: TemporalParserSpec | "auto";
  options: ParsedColumnOptions;
  requestedTime: boolean;
  requestedKind?: "date" | "datetime";
  forcedDiscrete: boolean;
  /** Explicit linear/log scale with no temporal options: numeric coercion only. */
  forcedNonTemporal: boolean;
}

export const AUTO_POSITION_CONVERSION: PositionConversionContext = Object.freeze({
  parser: "auto",
  sourceParser: "auto",
  options: Object.freeze({}),
  requestedTime: false,
  forcedDiscrete: false,
  forcedNonTemporal: false,
});

const DISCRETE_POSITION_CONVERSION: PositionConversionContext = Object.freeze({
  parser: "auto",
  sourceParser: "auto",
  options: Object.freeze({}),
  requestedTime: false,
  forcedDiscrete: true,
  forcedNonTemporal: false,
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

/**
 * Read a position column as scale-space numbers. With a pre-stat transform the
 * cached transformed view (OOB/NA/forward) is returned; otherwise the semantic
 * numeric view (identity). The two coincide for identity + unpinned + no-NA.
 */
export function positionColumn(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
  transform: ColumnTransformConfig | undefined,
): Float64Array {
  if (transform === undefined) {
    return table.numeric(field, conversion.sourceParser, conversion.options);
  }
  return table.transformed(field, conversion.sourceParser, conversion.options, transform)
    .transformed;
}

export function positionFieldType(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
): FieldType {
  return conversion.forcedDiscrete
    ? "nominal"
    : table.fieldType(field, conversion.sourceParser, conversion.options);
}

export function positionDiscreteness(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
): Discreteness {
  return conversion.forcedDiscrete
    ? "discrete"
    : table.discreteness(field, conversion.sourceParser, conversion.options);
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
  const temporal =
    !conversion.forcedNonTemporal &&
    (conversion.parser !== "auto" || parsed.decision.status === "temporal");
  const numeric = conversion.forcedNonTemporal
    ? cellsToQuantitative(values)
    : temporal
      ? parsed.semantic.slice()
      : cellsToNumeric(values);
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
  if (config === undefined) return AUTO_POSITION_CONVERSION;
  if (config.type === "band") return DISCRETE_POSITION_CONVERSION;
  const requestedTime =
    config.type === "time" ||
    config.parse !== undefined ||
    config.temporalKind !== undefined ||
    config.timezone !== undefined ||
    config.disambiguation !== undefined ||
    config.parseFailure !== undefined ||
    config.dateBreaks !== undefined ||
    config.dateMinorBreaks !== undefined ||
    config.dateLabels !== undefined ||
    config.locale !== undefined ||
    config.weekStart !== undefined;
  const forcedNonTemporal = (config.type === "linear" || config.type === "log") && !requestedTime;
  return {
    parser: config.parse ?? "auto",
    sourceParser: config.parse ?? "auto",
    options: {
      ...(config.timezone !== undefined && { timezone: config.timezone }),
      ...(config.disambiguation !== undefined && {
        disambiguation: config.disambiguation,
      }),
      ...(config.parseFailure !== undefined && { failurePolicy: config.parseFailure }),
      ...(forcedNonTemporal && { inferTemporal: false }),
    },
    requestedTime,
    ...(config.temporalKind !== undefined && { requestedKind: config.temporalKind }),
    forcedDiscrete: false,
    forcedNonTemporal,
  };
}
