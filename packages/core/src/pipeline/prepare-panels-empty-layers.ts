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
    const binding = bindings[index]!;
    const allEmpty = panelFrames.every((frames) => frames[index]!.n === 0);
    // geom_abline is annotation-only and always rowless, but it still draws —
    // it carries no ruleForm, so it needs its own exemption here.
    const annotation = binding.ruleForm === "annotation" || binding.layer.geom === "abline";
    if (allEmpty && !annotation) {
      warnings.push({
        code: "empty-layer",
        message: `Layer ${index} (${bindings[index]!.layer.geom}) has no drawable rows after its stat; skipping it.`,
      });
    }
  }
}
