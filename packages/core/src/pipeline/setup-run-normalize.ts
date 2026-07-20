/**
 * Normalize + validate a pipeline spec entry.
 */
import type { PortableSpec, SpecError, SpecInput } from "@ggsvelte/spec";
import {
  normalize,
  SpecValidationError,
  temporalLabelConfigurationError,
  temporalLocaleConfigurationError,
  validate,
} from "@ggsvelte/spec";

import { PipelineError } from "./types.js";

function preflightTemporalLabels(spec: PortableSpec): void {
  for (const axis of ["x", "y"] as const) {
    const dateLabels = spec.scales?.[axis]?.dateLabels;
    if (typeof dateLabels !== "string") continue;
    const error = temporalLabelConfigurationError(dateLabels);
    if (error === null) continue;
    const path = `/scales/${axis}/dateLabels`;
    throw new PipelineError("invalid-temporal-labels", path, error, {
      code: "invalid-temporal-labels",
      severity: "error",
      path,
      problem: "The temporal label format is not in the closed portable grammar.",
      cause: error,
      fixes: [{ description: "Use only the documented dateLabels tokens." }],
      documentationUrl: "/guide/temporal-scales#formatting",
    });
  }
}

export function normalizeAndValidateSpec(spec: SpecInput | PortableSpec): PortableSpec {
  const normalized = normalize(spec);
  // Preserve the stable pipeline diagnostic before the portable schema rejects
  // the same closed-token violation as a generic shape error.
  preflightTemporalLabels(normalized);
  const result = validate(normalized);
  if (!result.ok) throw new SpecValidationError(result.errors);

  const scaleTypeMismatchCode: SpecError["code"] = "scale-type-mismatch";
  const temporalScaleErrors: SpecError[] = [];
  for (const axis of ["x", "y"] as const) {
    const config = normalized.scales?.[axis];
    const hasTemporalGuideOption =
      config?.dateBreaks !== undefined ||
      config?.dateMinorBreaks !== undefined ||
      config?.dateLabels !== undefined ||
      config?.locale !== undefined ||
      config?.weekStart !== undefined;
    if (hasTemporalGuideOption && (config?.type === "linear" || config?.type === "log")) {
      temporalScaleErrors.push({
        code: scaleTypeMismatchCode,
        path: `/scales/${axis}`,
        message: `scales.${axis} uses temporal break or label options with explicit type "${config.type}".`,
        fix: {
          description:
            'Use type "time", a date/datetime scale helper, or remove the temporal option.',
        },
      });
    }
  }
  if (temporalScaleErrors.length > 0) throw new SpecValidationError(temporalScaleErrors);

  for (const axis of ["x", "y"] as const) {
    const config = normalized.scales?.[axis];
    if (config?.locale !== undefined) {
      const error = temporalLocaleConfigurationError(config.locale);
      if (error !== null) {
        const path = `/scales/${axis}/locale`;
        throw new PipelineError("invalid-temporal-locale", path, error, {
          code: "invalid-temporal-locale",
          severity: "error",
          path,
          problem: "The temporal label locale is not a supported BCP 47 locale.",
          cause: error,
          fixes: [{ description: "Use a canonical locale such as en-US or fr-FR." }],
          documentationUrl: "/guide/temporal-scales#formatting",
        });
      }
    }
  }
  return normalized;
}
