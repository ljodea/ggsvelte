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
import { scaleTrainingDiagnostics } from "./assemble-render-model-scale-training-diagnostics.js";
import type { RenderModel } from "./types.js";
import type { BandLabelMode } from "../layout/band-guide.js";

export type { AssembleRenderModelInput } from "./assemble-render-model-input.js";

/** coord_flip fix shared by band degradations (each long label gets its own row). */
const COORD_FLIP_FIX = {
  description: "Map the category to y with coord_flip so each long label gets its own row.",
  typescript: ".coordFlip()",
  portable: { coord: { type: "flip" } },
} as const;

function bandGuideDiagnostic(code: string, aesthetic: "x" | "y", mode: BandLabelMode | undefined) {
  const margin = code === "band-label-margin-overflow";
  // A margin overflow on a single-line axis is a HORIZONTAL end-cap problem (a
  // wide end label past the panel edge), not a rotated-label bottom-margin one —
  // so steer the user to width, not height, and never claim rotation.
  const horizontalCap = margin && mode === "single-line";
  return {
    code,
    severity: "warning" as const,
    path: `/scales/${aesthetic}`,
    problem: horizontalCap
      ? "A categorical end label is truncated to fit the axis width."
      : margin
        ? "A rotated categorical label is truncated to fit the axis margin cap."
        : "Categorical labels overlap even after wrapping and rotation.",
    cause: horizontalCap
      ? "The end label extends past the panel edge and the bounded side margin can't fit it."
      : margin
        ? "The full label is longer than the bounded bottom margin allows, even rotated."
        : "There are more (or longer) categories than the axis width can separate.",
    fixes: [
      {
        description: horizontalCap
          ? "Use shorter category labels or allocate more chart width."
          : margin
            ? "Use shorter category labels or allocate more chart height."
            : "Reduce the number of categories or allocate more chart width.",
      },
      COORD_FLIP_FIX,
    ],
    documentationUrl: "/guide/discrete-scales#categorical-axis-labels",
  };
}

function temporalGuideDiagnostic(code: string, aesthetic: "x" | "y") {
  const margin = code === "temporal-label-margin-overflow";
  const outside = code === "temporal-break-outside-domain";
  return {
    code,
    severity: "warning" as const,
    path: `/scales/${aesthetic}${outside ? "/breaks" : ""}`,
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
  };
}

function guidePlanDiagnostics(input: AssembleRenderModelInput): RenderModel["scaleDiagnostics"] {
  const seen = new Set<string>();
  return input.guidePlans.flatMap((plan) =>
    plan.type === "axis"
      ? plan.degraded.flatMap((code) => {
          const key = `${code}:${plan.aesthetic}`;
          if (seen.has(key)) return [];
          seen.add(key);
          return [
            plan.scaleType === "band"
              ? bandGuideDiagnostic(code, plan.aesthetic, plan.bandLabelMode)
              : temporalGuideDiagnostic(code, plan.aesthetic),
          ];
        })
      : [],
  );
}

/** Advisories for the heuristic band label layout the planner chose (Hadley lesson 12). */
function bandLabelAdvisories(
  guidePlans: AssembleRenderModelInput["guidePlans"],
): { code: string; path: string; chosen: string; howToOverride: string }[] {
  const seen = new Set<string>();
  const out: { code: string; path: string; chosen: string; howToOverride: string }[] = [];
  for (const plan of guidePlans) {
    if (plan.type !== "axis" || plan.scaleType !== "band") continue;
    // Author-pinned modes are intentional — do not emit heuristic wrap/rotate advisories.
    if (plan.bandLabelAuthorPinned === true) continue;
    const mode = plan.bandLabelMode;
    if (mode !== "wrapped" && mode !== "rotated") continue;
    const key = `${mode}:${plan.aesthetic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      mode === "wrapped"
        ? {
            code: "band-labels-wrapped",
            path: `/scales/${plan.aesthetic}`,
            chosen: "wrapped long labels onto multiple lines",
            howToOverride: `Set scales.${plan.aesthetic}.guide.mode ("single"|"wrap"|"rotate"|"off") or .guide.wrap, use shorter labels, or coordFlip() for horizontal bars.`,
          }
        : {
            code: "band-labels-rotated",
            path: `/scales/${plan.aesthetic}`,
            chosen: `rotated long labels ${String(plan.bandLabelAngle ?? -90)}°`,
            howToOverride: `Set scales.${plan.aesthetic}.guide.mode ("single"|"wrap"|"rotate"|"off") or .guide.angle, or coordFlip() for horizontal category rows.`,
          },
    );
  }
  return out;
}

export function assembleRenderModel(input: AssembleRenderModelInput): RenderModel {
  const { scene, candidates } = input;
  const lifecycle = createRenderModelLifecycle({
    scene,
    candidates,
    table: input.table,
  });
  const advisories = [...input.advisories, ...bandLabelAdvisories(input.guidePlans)];
  const diagnostics = dedupeRenderModelDiagnostics(input.warnings, advisories);

  return {
    scene,
    scales: buildRenderModelScales(input),
    warnings: diagnostics.warnings,
    advisories: diagnostics.advisories,
    scaleDiagnostics: [
      ...input.scaleDiagnostics,
      ...scaleTrainingDiagnostics(diagnostics.warnings, diagnostics.advisories),
      ...guidePlanDiagnostics(input),
    ],
    scaleDecisions: input.scaleDecisions.map((decision) => ({
      ...decision,
      domain: decision.aesthetic === "x" ? [...input.xScale.domain] : [...input.yScale.domain],
      guidePlanIds: input.guidePlans
        .filter((plan) => plan.aesthetic === decision.aesthetic)
        .map((plan) => plan.id),
    })),
    guidePlans: input.guidePlans,
    coordProjectors: input.coordProjectors,
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
