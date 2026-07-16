/**
 * Empty-domain and log-nonpositive warnings after continuous training.
 */
import type { PipelineWarning } from "./types.js";

export function pushContinuousTrainingWarnings(
  axis: "x" | "y",
  type: "linear" | "log" | "time",
  training: { empty: boolean; nonPositive: number },
  warnings: PipelineWarning[],
): void {
  if (training.empty) {
    warnings.push({
      code: "empty-domain",
      message: `The ${axis} scale has no finite${type === "log" ? " positive" : ""} values; using a default domain.`,
    });
  }
  if (training.nonPositive > 0) {
    warnings.push({
      code: "log-nonpositive",
      message: `Removed ${training.nonPositive} non-positive value(s) from the ${axis} log scale (log10 is undefined at or below zero).`,
    });
  }
}
