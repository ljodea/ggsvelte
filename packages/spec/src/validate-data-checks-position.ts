/**
 * Position (x/y) data-aware scale checks.
 *
 * Two entry points (must stay on opposite sides of resolveFieldEvidence):
 *  - validateTemporalAxisConfiguration — pre-evidence config errors + invalidTemporalAxes
 *  - checkPositionScaleDataCompatibility — post-layer scale/type vs field evidence
 *
 * Shared temporal memoization: validate-data-checks-temporal.ts.
 * Color: validate-data-checks-color.ts. Style: validate-data-checks-style.ts (finite + numeric).
 * Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import type { PositionScaleSpec } from "./schema.js";
import { temporalParserConfigurationError } from "./temporal-parse.js";
import {
  parseTemporalInterval,
  temporalLabelConfigurationError,
  temporalLocaleConfigurationError,
} from "./temporal-interval.js";
import type { FieldEvidenceEntry, FieldEvidenceMap } from "./validate-data-evidence.js";
import {
  appendTemporalKindMismatch,
  temporalDecisionForField,
  type ChannelFieldUse,
  type TemporalDecisionCache,
} from "./validate-data-checks-temporal.js";

const AXIS_CHANNELS = ["x", "y"] as const;

const NON_TIME_TYPES_WITH_TEMPORAL_GUIDES = new Set(["band", "linear", "log"]);

/**
 * Temporal break/label options on an explicit non-time scale.
 * Shared by agent `validate()` and the TypeBox-free render gate.
 */
export function temporalGuideTypeMismatchError(
  scales: Record<string, unknown> | undefined,
  axis: "x" | "y",
): SpecError | null {
  const config = scales?.[axis] as PositionScaleSpec | undefined;
  const hasGuideTemporalOption =
    config?.dateBreaks !== undefined ||
    config?.dateMinorBreaks !== undefined ||
    config?.dateLabels !== undefined ||
    config?.locale !== undefined ||
    config?.weekStart !== undefined;
  if (
    !hasGuideTemporalOption ||
    config?.type === undefined ||
    !NON_TIME_TYPES_WITH_TEMPORAL_GUIDES.has(config.type)
  ) {
    return null;
  }
  return {
    code: "scale-type-mismatch",
    path: `/scales/${axis}`,
    message: `scales.${axis} uses temporal break or label options with explicit type "${config.type}".`,
    fix: {
      description: 'Use type "time", a date/datetime scale helper, or remove the temporal option.',
    },
  };
}

/** True when the axis scale config requests temporal semantics (not band). */
export function scaleRequestsTime(
  scales: Record<string, unknown> | undefined,
  axis: "x" | "y",
): boolean {
  const config = scales?.[axis] as PositionScaleSpec | undefined;
  if (config?.type === "band") return false;
  if (config?.type === "time") return true;
  return [
    config?.parse,
    config?.temporalKind,
    config?.timezone,
    config?.disambiguation,
    config?.parseFailure,
    config?.dateBreaks,
    config?.dateMinorBreaks,
    config?.dateLabels,
    config?.locale,
    config?.weekStart,
  ].some((value) => value !== undefined);
}

function temporalAxisConfigurationError(config: PositionScaleSpec | undefined): string | null {
  const effectiveParser = config?.parse ?? (config?.temporalKind === "monthDay" ? "md" : "auto");
  const parserError = temporalParserConfigurationError(effectiveParser, {
    ...(config?.timezone !== undefined && { timezone: config.timezone }),
    ...(config?.disambiguation !== undefined && { disambiguation: config.disambiguation }),
  });
  if (parserError !== null) return parserError;
  const intervalError = temporalIntervalConfigurationError(config);
  if (intervalError !== null) return intervalError;
  const labelError =
    config?.dateLabels === undefined
      ? null
      : temporalLabelConfigurationError(config.dateLabels, config.temporalKind);
  if (labelError !== null) return labelError;
  return config?.locale === undefined ? null : temporalLocaleConfigurationError(config.locale);
}

function temporalIntervalConfigurationError(config: PositionScaleSpec | undefined): string | null {
  for (const interval of [config?.dateBreaks, config?.dateMinorBreaks]) {
    if (interval === undefined) continue;
    try {
      parseTemporalInterval(interval);
    } catch (error) {
      return error instanceof Error ? error.message : "invalid temporal interval";
    }
  }
  return null;
}

/**
 * Validate temporal axis configuration before field evidence is resolved.
 * Errors here are included even when data/profile is missing or invalid.
 * Returns invalidTemporalAxes so post-layer position checks skip broken axes.
 */
export function validateTemporalAxisConfiguration(scales: Record<string, unknown> | undefined): {
  errors: SpecError[];
  invalidTemporalAxes: Set<"x" | "y">;
} {
  const errors: SpecError[] = [];
  const invalidTemporalAxes = new Set<"x" | "y">();
  for (const axis of AXIS_CHANNELS) {
    const config = scales?.[axis] as PositionScaleSpec | undefined;
    const mismatch = temporalGuideTypeMismatchError(scales, axis);
    if (mismatch !== null) {
      invalidTemporalAxes.add(axis);
      errors.push(mismatch);
      continue;
    }
    if (config?.type === "band" || !scaleRequestsTime(scales, axis)) continue;
    const configurationError = temporalAxisConfigurationError(config);
    if (configurationError === null) continue;
    invalidTemporalAxes.add(axis);
    errors.push({
      code: "scale-type-mismatch",
      path: `/scales/${axis}`,
      message: `scales.${axis} has invalid temporal configuration: ${configurationError}.`,
      fix: {
        description: "Correct the parser, interval, label, locale, or timezone configuration.",
      },
    });
  }
  return { errors, invalidTemporalAxes };
}

/** Post-layer x/y scale type compatibility against collected field uses. */
export function checkPositionScaleDataCompatibility(input: {
  scales: Record<string, unknown> | undefined;
  fields: FieldEvidenceMap;
  /**
   * Optional per-use evidence lookup. When provided, prefer it over the
   * last-wins `fields` union so multi-table layers with the same field name
   * keep their own type evidence (#609).
   */
  evidenceForUse?: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  axisFields: Record<"x" | "y", ChannelFieldUse[]>;
  invalidTemporalAxes: ReadonlySet<"x" | "y">;
  temporalDecisionCache: TemporalDecisionCache;
}): SpecError[] {
  const { scales, fields, axisFields, invalidTemporalAxes, temporalDecisionCache } = input;
  const errors: SpecError[] = [];
  const evidenceOf = (use: ChannelFieldUse) => input.evidenceForUse?.(use) ?? fields.get(use.field);

  for (const axis of AXIS_CHANNELS) {
    const config = scales?.[axis] as PositionScaleSpec | undefined;
    const declared =
      config?.type === "band" ? "band" : scaleRequestsTime(scales, axis) ? "time" : config?.type;
    if (declared === undefined || declared === "band" || invalidTemporalAxes.has(axis)) continue;
    for (const use of axisFields[axis]) {
      const info = evidenceOf(use);
      if (info === undefined || info.type === null) continue;
      const type = info.type;
      if (declared === "time") {
        errors.push(...timePositionErrors(axis, use, info, config, temporalDecisionCache));
      } else if (
        (declared === "log" || declared === "linear") &&
        (type === "nominal" || type === "ordinal")
      ) {
        errors.push(linearPositionError(axis, declared, use, type));
      }
    }
  }
  return errors;
}

function timePositionErrors(
  axis: "x" | "y",
  use: ChannelFieldUse,
  info: FieldEvidenceEntry,
  config: PositionScaleSpec | undefined,
  cache: TemporalDecisionCache,
): SpecError[] {
  const effectiveParser = config?.parse ?? (config?.temporalKind === "monthDay" ? "md" : "auto");
  const options = temporalPositionOptions(config);
  const decision = temporalDecisionForField(cache, use.field, info, effectiveParser, options);
  const profileTemporal = info.values === null && info.type === "temporal";
  if (timePositionResolves(config, decision, profileTemporal)) {
    const errors: SpecError[] = [];
    appendTemporalKindMismatch(errors, {
      axis,
      path: use.path,
      field: use.field,
      expected: config?.temporalKind,
      actual: decision?.kind ?? null,
    });
    return errors;
  }
  const firstFailure = decision?.failures?.[0];
  const detail =
    firstFailure === undefined
      ? temporalDecisionDetail(decision)
      : ` Parser ${JSON.stringify(effectiveParser)} rejected ${decision?.failedCount ?? 0} value(s), including row ${firstFailure.index}: ${JSON.stringify(firstFailure.value)}.`;
  return [
    {
      code: "scale-type-mismatch",
      path: use.path,
      message: `scales.${axis} requests time but field "${use.field}" is ${info.type}.${detail}`,
      fix: {
        description:
          config?.parse === undefined
            ? `Set scales.${axis}.parse to an explicit temporal order, or set scales.${axis}.type to "band" to keep categories.`
            : `Correct the rejected values, choose the matching scales.${axis}.parse value, or use parseFailure: "censor" explicitly.`,
      },
    },
  ];
}

function temporalPositionOptions(config: PositionScaleSpec | undefined) {
  return {
    ...(config?.timezone !== undefined && { timezone: config.timezone }),
    ...(config?.disambiguation !== undefined && { disambiguation: config.disambiguation }),
  };
}

function timePositionResolves(
  config: PositionScaleSpec | undefined,
  decision: ReturnType<typeof temporalDecisionForField>,
  profileTemporal: boolean,
): boolean {
  return (
    decision?.status === "temporal" ||
    profileTemporal ||
    (config?.parse !== undefined &&
      config.parseFailure === "censor" &&
      decision?.status === "invalid")
  );
}

function temporalDecisionDetail(decision: ReturnType<typeof temporalDecisionForField>): string {
  if (decision?.status === "ambiguous") {
    return ` Automatic temporal inference was ambiguous between: ${decision.candidates.join(", ")}.`;
  }
  if (decision?.status === "invalid") {
    return ` Automatic temporal inference failed whole-column validation for ${decision.failedCount} value(s).`;
  }
  return "";
}

function linearPositionError(
  axis: "x" | "y",
  declared: "log" | "linear",
  use: ChannelFieldUse,
  type: "nominal" | "ordinal",
): SpecError {
  return {
    code: "scale-type-mismatch",
    path: use.path,
    message: `scales.${axis}.type is "${declared}" but field "${use.field}" is ${type}; use a band scale (or a quantitative field).`,
    fix: { description: `Set scales.${axis}.type to "band".` },
  };
}
