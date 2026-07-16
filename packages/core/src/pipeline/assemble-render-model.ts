/**
 * Assemble the public RenderModel (scene, scales, contracts, dispose/row).
 */
import type { AssembleRenderModelInput } from "./assemble-render-model-input.js";
import {
  dedupeRenderModelDiagnostics,
  freezeRenderModelDomains,
} from "./assemble-render-model-domains.js";
import {
  buildRenderModelAxisFormatters,
  buildRenderModelScales,
} from "./assemble-render-model-scales.js";
import { createRenderModelLifecycle } from "./assemble-render-model-lifecycle.js";
import type { RenderModel } from "./types.js";

export type { AssembleRenderModelInput } from "./assemble-render-model-input.js";

export function assembleRenderModel(input: AssembleRenderModelInput): RenderModel {
  const { scene, candidates } = input;
  const lifecycle = createRenderModelLifecycle({
    scene,
    candidates,
    table: input.table,
  });
  const diagnostics = dedupeRenderModelDiagnostics(input.warnings, input.advisories);

  return {
    scene,
    scales: buildRenderModelScales(input),
    warnings: diagnostics.warnings,
    advisories: diagnostics.advisories,
    runId: input.runId,
    layerBackends: input.layerBackends,
    layerFields: input.layerFields,
    layerScaledConstants: input.layerScaledConstants,
    domains: freezeRenderModelDomains(input.baselineDomains, input.effectiveDomains),
    lineage: input.lineage,
    candidates,
    axisFormatters: buildRenderModelAxisFormatters(
      input.xScale,
      input.yScale,
      input.formatX,
      input.formatY,
    ),
    row: lifecycle.row,
    dispose: lifecycle.dispose,
  };
}
