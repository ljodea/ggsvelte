/** Shared temporal preflight helpers (docs + config assert). */
import { temporalParserConfigurationError } from "@ggsvelte/spec";

import type { PositionConversionContext } from "./temporal-position.js";
import { PipelineError } from "./types.js";

export function temporalPreflightDocs(code: string): string {
  return `https://ggsvelte.sh/guide/errors#${code}`;
}

export function assertTemporalConfiguration(
  axis: "x" | "y",
  conversion: PositionConversionContext,
): void {
  if (conversion.forcedDiscrete) return;
  const configurationError = temporalParserConfigurationError(
    conversion.parser,
    conversion.options,
  );
  if (configurationError === null) return;
  const message = `The ${axis} scale has invalid temporal parser configuration: ${configurationError}.`;
  throw new PipelineError("temporal-parse-failed", `/scales/${axis}`, message, {
    code: "temporal-parse-failed",
    severity: "error",
    path: `/scales/${axis}`,
    problem: "Temporal parser configuration is invalid.",
    cause: message,
    fixes: [{ description: "Correct the parser format or timezone configuration." }],
    documentationUrl: temporalPreflightDocs("temporal-parse-failed"),
  });
}
