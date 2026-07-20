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

function guidePlanDiagnostics(input: AssembleRenderModelInput): RenderModel["scaleDiagnostics"] {
  const seen = new Set<string>();
  return input.guidePlans.flatMap((plan) =>
    plan.degraded.flatMap((code) => {
      const key = `${code}:${plan.aesthetic}`;
      if (seen.has(key)) return [];
      seen.add(key);
      const margin = code === "temporal-label-margin-overflow";
      const outside = code === "temporal-break-outside-domain";
      return [
        {
          code,
          severity: "warning" as const,
          path: `/scales/${plan.aesthetic}${outside ? "/breaks" : ""}`,
          problem: outside
            ? "One or more explicit temporal breaks are outside the trained domain."
            : margin
              ? "Temporal labels exceed the axis margin cap."
              : "Temporal labels overlap at the available panel extent.",
          cause: outside
            ? "Breaks outside the scale domain cannot be projected onto this axis."
            : margin
              ? "The complete label text is wider than the bounded margin."
              : "No bounded automatic candidate fits, or authored breaks are denser than the extent.",
          fixes: [
            {
              description: outside
                ? "Remove the out-of-domain breaks or widen the explicit domain."
                : margin
                  ? "Use a shorter dateLabels format or allocate more chart space."
                  : "Use a coarser dateBreaks interval or allocate more chart space.",
            },
          ],
          documentationUrl: "/guide/temporal-scales#responsive-calendar-labels",
        },
      ];
    }),
  );
}

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
    scaleDiagnostics: [...input.scaleDiagnostics, ...guidePlanDiagnostics(input)],
    scaleDecisions: input.scaleDecisions.map((decision) => ({
      ...decision,
      domain: decision.aesthetic === "x" ? [...input.xScale.domain] : [...input.yScale.domain],
      guidePlanIds: input.guidePlans
        .filter((plan) => plan.aesthetic === decision.aesthetic)
        .map((plan) => plan.id),
    })),
    guidePlans: input.guidePlans,
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
      input.xConversion,
      input.yConversion,
    ),
    row: lifecycle.row,
    dispose: lifecycle.dispose,
  };
}
