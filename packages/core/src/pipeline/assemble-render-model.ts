/**
 * Assemble the public RenderModel (scene, scales, contracts, dispose/row).
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import type { BandLabelMode } from "../layout/band-guide.js";
import type { GuideDegradedCode } from "../layout/guide-degraded-codes.js";
import type { TickFormatter } from "../layout/layout.js";
import type { GuidePlan } from "../layout/temporal-guide.js";
import type { ResolvedStyleScale } from "../scales/style.js";
import type { ScaleState } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";
import type { Scene } from "../scene.js";
import type { CellValue, ColumnTable } from "../table.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import { createSemanticViewport } from "../semantic-viewport.js";
import type { AdvisoryCode } from "../diagnostics.js";

import {
  dedupeRenderModelDiagnostics,
  freezeRenderModelDomains,
} from "./assemble-render-model-domains.js";
import {
  buildRenderModelAxisFormatters,
  buildRenderModelScales,
} from "./assemble-render-model-scales.js";
import { createRenderModelLifecycle } from "./assemble-render-model-lifecycle.js";
import type { SourceRegistry } from "./source-registry.js";
import type { PositionConversionContext } from "./temporal-position.js";
import type {
  Advisory,
  LayerBackend,
  MappedField,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  ScaleDecision,
  ScaleDiagnostic,
  ScaleDomainSnapshot,
} from "./types.js";

export interface AssembleRenderModelInput {
  scene: Scene;
  xScale: PositionScale;
  yScale: PositionScale;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  styles: Record<string, ResolvedStyleScale | null>;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorState: ScaleState | null;
  fillState: ScaleState | null;
  styleStates: Record<string, ScaleState | null>;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  scaleDecisions: ScaleDecision[];
  scaleDiagnostics: ScaleDiagnostic[];
  guidePlans: readonly GuidePlan[];
  coordProjectors: readonly PanelCoordProjector[];
  flipped: boolean;
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
  runId: number;
  layerBackends: LayerBackend[];
  layerFields: MappedField[][];
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  baselineDomains: ScaleDomainSnapshot;
  effectiveDomains: ScaleDomainSnapshot;
  lineage: LineageStore<number>;
  candidates: CandidateStore;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  table: ColumnTable;
  /** Multi-table global row registry (#589). When set, model.row uses it. */
  sourceRegistry?: SourceRegistry | null;
}

/** coord_flip fix shared by band degradations (each long label gets its own row). */
const COORD_FLIP_FIX = {
  description: "Map the category to y with coord_flip so each long label gets its own row.",
  typescript: ".coordFlip()",
  portable: { coord: { type: "flip" } },
} as const;

type BandGuideDegradedCode = Extract<
  GuideDegradedCode,
  "band-label-overlap" | "band-label-margin-overflow"
>;
type TemporalGuideDegradedCode = Extract<
  GuideDegradedCode,
  "temporal-label-overlap" | "temporal-label-margin-overflow" | "temporal-break-outside-domain"
>;

function bandGuideDiagnostic(
  code: BandGuideDegradedCode,
  aesthetic: "x" | "y",
  mode: BandLabelMode | undefined,
): ScaleDiagnostic {
  const margin = code === "band-label-margin-overflow";
  // A margin overflow on a single-line axis is a HORIZONTAL end-cap problem (a
  // wide end label past the panel edge), not a rotated-label bottom-margin one —
  // so steer the user to width, not height, and never claim rotation.
  // Forced wrap overflow is neither rotation nor truncation: over-tall wraps need
  // height; side overhang from wide wrap lines needs width — mention both.
  const horizontalCap = margin && mode === "single-line";
  const wrappedCap = margin && mode === "wrapped";
  return {
    code,
    severity: "warning" as const,
    path: `/scales/${aesthetic}`,
    problem: horizontalCap
      ? "A categorical end label is truncated to fit the axis width."
      : wrappedCap
        ? "A wrapped categorical label exceeds the axis margin budget."
        : margin
          ? "A rotated categorical label is truncated to fit the axis margin cap."
          : "Categorical labels overlap even after wrapping and rotation.",
    cause: horizontalCap
      ? "The end label extends past the panel edge and the bounded side margin can't fit it."
      : wrappedCap
        ? "The forced wrap footprint is taller than the bottom margin and/or wider than the side margin allows."
        : margin
          ? "The full label is longer than the bounded bottom margin allows, even rotated."
          : "There are more (or longer) categories than the axis width can separate.",
    fixes: [
      {
        description: horizontalCap
          ? "Use shorter category labels or allocate more chart width."
          : wrappedCap
            ? "Use shorter category labels, fewer wrap lines, or allocate more chart width/height."
            : margin
              ? "Use shorter category labels or allocate more chart height."
              : "Reduce the number of categories or allocate more chart width.",
      },
      COORD_FLIP_FIX,
    ],
    documentationUrl: "/guide/discrete-scales#categorical-axis-labels",
  };
}

function temporalGuideDiagnostic(
  code: TemporalGuideDegradedCode,
  aesthetic: "x" | "y",
): ScaleDiagnostic {
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
          if (plan.scaleType === "band") {
            if (code !== "band-label-overlap" && code !== "band-label-margin-overflow") return [];
            return [bandGuideDiagnostic(code, plan.aesthetic, plan.bandLabelMode)];
          }
          if (
            code !== "temporal-label-overlap" &&
            code !== "temporal-label-margin-overflow" &&
            code !== "temporal-break-outside-domain"
          ) {
            return [];
          }
          return [temporalGuideDiagnostic(code, plan.aesthetic)];
        })
      : [],
  );
}

/** Advisories for the heuristic band label layout the planner chose (Hadley lesson 12). */
function bandLabelAdvisories(guidePlans: AssembleRenderModelInput["guidePlans"]): Advisory[] {
  const seen = new Set<string>();
  const out: Advisory[] = [];
  for (const plan of guidePlans) {
    if (plan.type !== "axis" || plan.scaleType !== "band") continue;
    // Author-pinned modes are intentional — do not emit heuristic wrap/rotate advisories.
    if (plan.bandLabelAuthorPinned === true) continue;
    const mode = plan.bandLabelMode;
    if (mode !== "wrapped" && mode !== "rotated") continue;
    const key = `${mode}:${plan.aesthetic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const code: AdvisoryCode = mode === "wrapped" ? "band-labels-wrapped" : "band-labels-rotated";
    out.push(
      mode === "wrapped"
        ? {
            code,
            path: `/scales/${plan.aesthetic}`,
            chosen: "wrapped long labels onto multiple lines",
            howToOverride: `Set scales.${plan.aesthetic}.guide.mode ("single"|"wrap"|"rotate"|"off") or .guide.wrap, use shorter labels, or coordFlip() for horizontal bars.`,
          }
        : {
            code,
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
  const scales = buildRenderModelScales(input);
  const lifecycle = createRenderModelLifecycle({
    scene,
    candidates,
    table: input.table,
    ...(input.sourceRegistry !== undefined && { sourceRegistry: input.sourceRegistry }),
  });
  const advisories = [...input.advisories, ...bandLabelAdvisories(input.guidePlans)];
  const diagnostics = dedupeRenderModelDiagnostics(input.warnings, advisories);

  return {
    scene,
    scales,
    warnings: diagnostics.warnings,
    advisories: diagnostics.advisories,
    // Training rich diagnostics are emitted with structured facts at train time
    // (#628). Prepare-time transform/OOB entries are one-per-field and share an
    // axis path — do not collapse them here. Free-panel training dedupe lives
    // on the training channel before merge (finalize).
    scaleDiagnostics: [...input.scaleDiagnostics, ...guidePlanDiagnostics(input)],
    scaleDecisions: input.scaleDecisions.map((decision) => ({
      ...decision,
      domain: decision.aesthetic === "x" ? [...input.xScale.domain] : [...input.yScale.domain],
      guidePlanIds: input.guidePlans
        .filter((plan) => plan.aesthetic === decision.aesthetic)
        .map((plan) => plan.id),
    })),
    guidePlans: input.guidePlans,
    coordProjectors: input.coordProjectors,
    viewport: createSemanticViewport({
      panels: scene.panels,
      scales,
      coordProjectors: input.coordProjectors,
      flipped: input.flipped,
      candidates,
      sceneSize: { width: scene.width, height: scene.height },
    }),
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
