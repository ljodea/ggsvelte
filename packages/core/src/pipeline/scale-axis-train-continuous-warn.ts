/**
 * Empty-domain warning after continuous training. Transform-domain drops
 * (log10 <= 0, sqrt < 0) are counted pre-stat by the column transform and
 * surfaced as `scale-transform-domain`, not from the trainer.
 */
import type { PipelineWarning } from "./types.js";

export function pushContinuousTrainingWarnings(
  axis: "x" | "y",
  _type: "linear" | "time",
  training: { empty: boolean; nonPositive: number },
  warnings: PipelineWarning[],
): void {
  if (training.empty) {
    warnings.push({
      code: "empty-domain",
      message: `The ${axis} scale has no finite values; using a default domain.`,
    });
  }
}
