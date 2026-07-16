/**
 * Warn when every panel leaves a non-annotation layer empty after stats.
 */
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function warnEmptyLayers(
  bindings: readonly LayerBinding[],
  panelFrames: readonly (readonly LayerFrame[])[],
  warnings: PipelineWarning[],
): void {
  for (let index = 0; index < bindings.length; index++) {
    const allEmpty = panelFrames.every((frames) => frames[index]!.n === 0);
    if (allEmpty && bindings[index]!.ruleForm !== "annotation") {
      warnings.push({
        code: "empty-layer",
        message: `Layer ${index} (${bindings[index]!.layer.geom}) has no drawable rows after its stat; skipping it.`,
      });
    }
  }
}
