/**
 * Position (x/y) data-aware scale checks.
 *
 * Two entry points (must stay on opposite sides of resolveFieldEvidence):
 *  - validateTemporalAxisConfiguration — pre-evidence config errors + invalidTemporalAxes
 *  - checkPositionScaleDataCompatibility — post-layer scale/type vs field evidence
 *
 * Shared temporal memoization: validate-data-checks-temporal.ts.
 * Color: validate-data-checks-color.ts. Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import type { PositionScaleSpec } from "./schema.js";
import { temporalParserConfigurationError } from "./temporal-parse.js";
import {
  parseTemporalInterval,
  temporalLabelConfigurationError,
  temporalLocaleConfigurationError,
} from "./temporal-interval.js";
import type { FieldEvidenceMap } from "./validate-data-evidence.js";
import {
  appendTemporalKindMismatch,
  temporalDecisionForField,
  type ChannelFieldUse,
  type TemporalDecisionCache,
} from "./validate-data-checks-temporal.js";

const AXIS_CHANNELS = ["x", "y"] as const;

/** True when the axis scale config requests temporal semantics (not band). */
export function scaleRequestsTime(
  scales: Record<string, unknown> | undefined,
  axis: "x" | "y",
): boolean {
  const config = scales?.[axis] as PositionScaleSpec | undefined;
  return (
    config?.type !== "band" &&
    (config?.type === "time" ||
      config?.parse !== undefined ||
      config?.temporalKind !== undefined ||
      config?.timezone !== undefined ||
      config?.disambiguation !== undefined ||
      config?.parseFailure !== undefined ||
      config?.dateBreaks !== undefined ||
      config?.dateMinorBreaks !== undefined ||
      config?.dateLabels !== undefined ||
      config?.locale !== undefined ||
      config?.weekStart !== undefined)
  );
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
    const hasGuideTemporalOption =
      config?.dateBreaks !== undefined ||
      config?.dateMinorBreaks !== undefined ||
      config?.dateLabels !== undefined ||
      config?.locale !== undefined ||
      config?.weekStart !== undefined;
    if (
      hasGuideTemporalOption &&
      (config?.type === "band" || config?.type === "linear" || config?.type === "log")
    ) {
      invalidTemporalAxes.add(axis);
      errors.push({
        code: "scale-type-mismatch",
        path: `/scales/${axis}`,
        message: `scales.${axis} uses temporal break or label options with explicit type "${config.type}".`,
        fix: {
          description:
            'Use type "time", a date/datetime scale helper, or remove the temporal option.',
        },
      });
      continue;
    }
    if (config?.type === "band" || !scaleRequestsTime(scales, axis)) continue;
    let configurationError = temporalParserConfigurationError(config?.parse ?? "auto", {
      ...(config?.timezone !== undefined && { timezone: config.timezone }),
      ...(config?.disambiguation !== undefined && { disambiguation: config.disambiguation }),
    });
    if (configurationError === null) {
      for (const interval of [config?.dateBreaks, config?.dateMinorBreaks]) {
        if (interval === undefined) continue;
        try {
          parseTemporalInterval(interval);
        } catch (error) {
          configurationError = error instanceof Error ? error.message : "invalid temporal interval";
          break;
        }
      }
    }
    if (configurationError === null && config?.dateLabels !== undefined) {
      configurationError = temporalLabelConfigurationError(config.dateLabels);
    }
    if (configurationError === null && config?.locale !== undefined) {
      configurationError = temporalLocaleConfigurationError(config.locale);
    }
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
  axisFields: Record<"x" | "y", ChannelFieldUse[]>;
  invalidTemporalAxes: ReadonlySet<"x" | "y">;
  temporalDecisionCache: TemporalDecisionCache;
}): SpecError[] {
  const { scales, fields, axisFields, invalidTemporalAxes, temporalDecisionCache } = input;
  const errors: SpecError[] = [];
  const typeOf = (field: string) => fields.get(field)?.type ?? null;

  for (const axis of AXIS_CHANNELS) {
    const config = scales?.[axis] as PositionScaleSpec | undefined;
    const declared =
      config?.type === "band" ? "band" : scaleRequestsTime(scales, axis) ? "time" : config?.type;
    if (declared === undefined || declared === "band" || invalidTemporalAxes.has(axis)) continue;
    for (const use of axisFields[axis]) {
      const type = typeOf(use.field);
      if (type === null) continue;
      if (declared === "time") {
        const info = fields.get(use.field);
        const decision = temporalDecisionForField(
          temporalDecisionCache,
          use.field,
          info,
          config?.parse ?? "auto",
          {
            ...(config?.timezone !== undefined && { timezone: config.timezone }),
            ...(config?.disambiguation !== undefined && {
              disambiguation: config.disambiguation,
            }),
          },
        );
        const censoredInvalid =
          config?.parse !== undefined &&
          config.parseFailure === "censor" &&
          decision?.status === "invalid";
        const profileTemporal = info?.values === null && type === "temporal";
        if (decision?.status === "temporal" || censoredInvalid || profileTemporal) {
          appendTemporalKindMismatch(errors, {
            axis,
            path: use.path,
            field: use.field,
            expected: config?.temporalKind,
            actual: decision?.kind ?? null,
          });
          continue;
        }
        const firstFailure = decision?.failures?.[0];
        const detail =
          firstFailure === undefined
            ? decision?.status === "ambiguous"
              ? ` Automatic temporal inference was ambiguous between: ${decision.candidates.join(", ")}.`
              : decision?.status === "invalid"
                ? ` Automatic temporal inference failed whole-column validation for ${decision.failedCount} value(s).`
                : ""
            : ` Parser ${JSON.stringify(config?.parse ?? "auto")} rejected ${decision?.failedCount ?? 0} value(s), including row ${firstFailure.index}: ${JSON.stringify(firstFailure.value)}.`;
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: `scales.${axis} requests time but field "${use.field}" is ${type}.${detail}`,
          fix: {
            description:
              config?.parse === undefined
                ? `Set scales.${axis}.parse to an explicit temporal order, or set scales.${axis}.type to "band" to keep categories.`
                : `Correct the rejected values, choose the matching scales.${axis}.parse value, or use parseFailure: "censor" explicitly.`,
          },
        });
        continue;
      }
      if (
        (declared === "log" || declared === "linear") &&
        (type === "nominal" || type === "ordinal")
      ) {
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: `scales.${axis}.type is "${declared}" but field "${use.field}" is ${type}; use a band scale (or a quantitative field).`,
          fix: { description: `Set scales.${axis}.type to "band".` },
        });
      }
    }
  }
  return errors;
}
