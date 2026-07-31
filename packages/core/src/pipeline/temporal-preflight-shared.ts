/** Shared temporal preflight helpers (docs + config assert). */
import { getTemporalRuntime } from "../temporal-runtime.js";

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
  if (conversion.parser === "auto") return;
  // Explicit parsers require the full temporal runtime.
  if (getTemporalRuntime() === null) {
    throw new PipelineError(
      "temporal-parse-failed",
      `/scales/${axis}`,
      `The ${axis} scale uses an explicit temporal parser and requires @ggsvelte/core (full) or @ggsvelte/core/temporal.`,
      {
        code: "temporal-parse-failed",
        severity: "error",
        path: `/scales/${axis}`,
        problem: "Temporal parser configuration requires the temporal runtime.",
        cause: "Lean render entry does not load the Temporal polyfill.",
        fixes: [
          { description: "Import @ggsvelte/core or @ggsvelte/core/temporal before rendering." },
        ],
        documentationUrl: temporalPreflightDocs("temporal-parse-failed"),
      },
    );
  }
  // Full config validation (format/timezone) is performed by the Temporal
  // polyfill path when parsing; invalid formats surface as temporal-parse-failed.
}
