/**
 * Normalize + validate a pipeline spec entry.
 */
import type { PortableSpec, SpecInput } from "@ggsvelte/spec";
import {
  normalize,
  SpecValidationError,
  temporalLabelConfigurationError,
  temporalLocaleConfigurationError,
  validate,
} from "@ggsvelte/spec";

import { PipelineError } from "./types.js";

export function normalizeAndValidateSpec(spec: SpecInput | PortableSpec): PortableSpec {
  const normalized = normalize(spec);
  const result = validate(normalized);
  if (!result.ok) throw new SpecValidationError(result.errors);
  for (const axis of ["x", "y"] as const) {
    const config = normalized.scales?.[axis];
    if (config?.dateLabels !== undefined) {
      const error = temporalLabelConfigurationError(config.dateLabels);
      if (error !== null) {
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
