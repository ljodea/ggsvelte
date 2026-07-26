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
  requestedKind?: "date" | "datetime" | "time";
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
 *
 * When `requestedKind === "time"`, values are projected into time-of-day scale
 * space (epoch ms on 1970-01-01Z) so marks, domains, and axis ticks share one
 * coordinate system — portable numbers are seconds since midnight (#831).
 */
export function positionColumn(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
  transform?: ColumnTransformConfig,
): Float64Array {
  const base =
    transform === undefined
      ? table.numeric(field, conversion.sourceParser, conversion.options)
      : table.transformed(field, conversion.sourceParser, conversion.options, transform)
          .transformed;
  if (conversion.requestedKind !== "time") return base;
  return mapToTimeOfDayMs(table.column(field), base);
}

export function positionFieldType(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
): FieldType {
  if (conversion.forcedDiscrete) return "nominal";
  if (conversion.forcedNonTemporal) {
    const raw = table.column(field);
    const numeric = table.numeric(field, conversion.sourceParser, conversion.options);
    let sawFinite = false;
    for (let index = 0; index < raw.length; index++) {
      if (raw[index] === null) continue;
      if (!Number.isFinite(numeric[index]!)) return "nominal";
      sawFinite = true;
    }
    return sawFinite ? "quantitative" : "nominal";
  }
  return table.fieldType(field, conversion.sourceParser, conversion.options);
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

/**
 * Map a cell to time-of-day scale space (epoch ms on 1970-01-01Z).
 * Portable numbers are **seconds since midnight** (#831).
 */
function cellToTimeOfDayMs(value: CellValue): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value * 1000;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return Number.NaN;
    return (
      ((value.getUTCHours() * 60 + value.getUTCMinutes()) * 60 + value.getUTCSeconds()) * 1000 +
      value.getUTCMilliseconds()
    );
  }
  return Number.NaN;
}

function mapToTimeOfDayMs(values: readonly CellValue[], base: Float64Array): Float64Array {
  const out = new Float64Array(values.length);
  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    if (typeof value === "number" || value instanceof Date) {
      out[index] = cellToTimeOfDayMs(value);
      continue;
    }
    // Parsed ISO/datetime strings already land as epoch ms in `base`.
    const ms = base[index]!;
    if (!Number.isFinite(ms)) {
      out[index] = Number.NaN;
      continue;
    }
    const d = new Date(ms);
    out[index] =
      ((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) * 1000 +
      d.getUTCMilliseconds();
  }
  return out;
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
    (conversion.parser !== "auto" ||
      parsed.decision.status === "temporal" ||
      conversion.requestedKind === "time");
  let numeric = conversion.forcedNonTemporal
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
  // scale_*_time: portable numbers are seconds since midnight (#831).
  if (conversion.requestedKind === "time") {
    numeric = mapToTimeOfDayMs(values, numeric);
  }
  return { values: numeric, decision: parsed.decision };
}

export function positionValueToNumber(
  value: CellValue,
  conversion: PositionConversionContext,
): number {
  return positionValuesToNumeric([value], conversion).values[0] ?? Number.NaN;
}

/** Convert one detached semantic value (for example an annotation intercept)
 * to the same scale space used by transformed frame columns and training. */
export function positionValueToScaleSpace(
  value: CellValue,
  conversion: PositionConversionContext,
  transform: ColumnTransformConfig | undefined,
): number {
  const numeric = positionValueToNumber(value, conversion);
  if (transform === undefined) return numeric;
  return transform.transform.valid(numeric) ? transform.transform.forward(numeric) : Number.NaN;
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
  const forcedNonTemporal =
    (config.type === "linear" || config.type === "log" || config.type === "binned") &&
    !requestedTime;
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
