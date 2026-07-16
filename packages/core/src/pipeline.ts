/**
 * runPipeline — the synchronous core pipeline (plan: "Core pipeline"):
 *
 *   spec -> normalize -> validate -> resolve theme -> bind data (ColumnTable,
 *     type inference) -> FACET PARTITION -> per panel, per layer: derive
 *     groups -> stat (per group) -> position adjust (stack/fill/dodge, data
 *     space) -> train scales (fixed: union across panels; free: positional
 *     domains per panel; discrete color/fill assignment ALWAYS global —
 *     one legend) -> legends measured -> bounded two-pass layout (axis
 *     titles + legends reserved INSIDE the loop; facet grids run the
 *     per-panel mirror of it) -> geometry (typed arrays, panel-local px;
 *     coord flip swaps the render axes here) -> Scene
 *
 * Facets partition BEFORE stats/positions (plan round-2 consensus): counts,
 * bins, stacks, and dodges are panel-local, exactly like ggplot2. The one
 * cross-panel coupling is deliberate: bin-stat BREAK GRIDS are shared across
 * panels when the x scale is fixed (ggplot2 derives breaks from the shared
 * scale dimension), and become per-panel under free_x.
 *
 * coord { type: "flip" } is the single orientation mechanism (no second
 * orientation code path): geometry is computed against the unflipped frame
 * with swapped extents, then vertices map (x, y) -> (W - y, H - x), so
 * stacks, dodges, band bars, rules, boxplots — everything — flips through
 * one transform. Axes/grid/hit geometry follow because they are derived
 * from the same swapped scales.
 *
 * Every heuristic emits a structured advisory { code, path, chosen,
 * howToOverride } (Hadley lesson 12) — the `scales` config surface makes the
 * howToOverride texts real. Data problems become warnings; spec problems
 * throw structured errors. Each call gets a monotonic run id — callers commit
 * the returned scale state only for the latest id.
 *
 * Failure policy (plan deliverable): empty data -> frame + axes placeholder;
 * empty layer -> skip + warning; all-null mapped column -> structured error;
 * zero-variance domain -> symmetric padding; log scales drop non-positive
 * values with a warning and REFUSE non-positive explicit domains.
 */

import type { PortableSpec, SpecInput } from "@ggsvelte/spec";
import { normalize, SpecValidationError, validate } from "@ggsvelte/spec";

import type { ScaleState } from "./scales/state.js";
import type { CellValue } from "./table.js";
import type { ColumnTable } from "./table.js";
import { resolveEditionDefaults } from "./editions.js";
import type { ThemeTokens } from "./theme.js";
import { resolveTheme, UnknownThemeError } from "./theme.js";
import { perfMark, perfMeasure } from "./perf.js";
import { LineageStore } from "./identity.js";

import type {
  Advisory,
  PipelineWarning,
  RenderModel,
  RunOptions,
  ScaleDomainSnapshot,
} from "./pipeline/types.js";
import { NO_ROW, PipelineError } from "./pipeline/types.js";
import { collectAxisInputs, trainAxis } from "./pipeline/scale-training.js";
import {
  dedupeAdvisories,
  dedupeWarnings,
  makeAxisValueFormatter,
  scaleDomainSnapshot,
} from "./pipeline/layout-helpers.js";
import { computePanelLayout } from "./pipeline/panel-layout.js";
import { assembleScene, buildGeometryBatches } from "./pipeline/assemble-scene.js";
import {
  resolveLayerBackends,
  resolveLayerFields,
  resolveLayerScaledConstants,
} from "./pipeline/layer-contracts.js";
import { buildPipelineCandidates } from "./pipeline/build-candidates.js";
import { preparePanels } from "./pipeline/prepare-panels.js";
import { trainPipelineScales } from "./pipeline/train-pipeline-scales.js";

// Re-export the public pipeline contract (import path stability).
export type {
  Advisory,
  AxisValueFormatter,
  LayerBackend,
  MappedField,
  NamedData,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  RunOptions,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./pipeline/types.js";
export { CANVAS_AUTO_THRESHOLD, PipelineError } from "./pipeline/types.js";
export { batchMarkCount } from "./pipeline/geometry.js";

// ---------------------------------------------------------------------------
// runPipeline
// ---------------------------------------------------------------------------

let nextRunId = 0;

export function runPipeline(spec: SpecInput | PortableSpec, options: RunOptions): RenderModel {
  const runId = ++nextRunId;
  perfMark("ggsvelte:pipeline:start");

  // normalize + validate (normalize is idempotent; validation is cheap and
  // makes every entry point honor the agent error contract)
  const normalized = normalize(spec);
  const result = validate(normalized);
  if (!result.ok) throw new SpecValidationError(result.errors);

  const warnings: PipelineWarning[] = [];
  const advisories: Advisory[] = [];

  // Defaults edition (Hadley lesson 13): the spec's stamped edition selects
  // the default theme table + palettes; explicit settings still win.
  const editionResolution = resolveEditionDefaults(normalized.edition, options.editions);
  if (editionResolution.unknownRequested !== null) {
    warnings.push({
      code: "unknown-edition",
      message:
        `The spec targets defaults edition ${editionResolution.unknownRequested}, which this ` +
        `version of ggsvelte does not know; falling back to edition ${editionResolution.edition} defaults.`,
    });
  }
  const editionDefaults = editionResolution.defaults;

  let theme: ThemeTokens;
  try {
    theme = resolveTheme(normalized.theme, editionDefaults.themes);
  } catch (error) {
    if (error instanceof UnknownThemeError) {
      throw new PipelineError("unknown-theme", "/theme", error.message);
    }
    throw error;
  }

  const flip = normalized.coord?.type === "flip";

  // bind + facet partition + per-panel frames
  perfMark("ggsvelte:bind:start");
  const { table, faceted, freeX, freeY, nrow, ncol, facetPanels, bindings, panelFrames } =
    preparePanels(normalized, options, warnings, advisories);
  perfMark("ggsvelte:bind:end");
  perfMeasure("ggsvelte:bind", "ggsvelte:bind:start", "ggsvelte:bind:end");

  // train scales — fixed: union across panels; free: positional domains per
  // panel; discrete color/fill assignment ALWAYS global (one legend).
  perfMark("ggsvelte:scales:start");
  const {
    xTraining,
    yTraining,
    panelScales,
    colorResolution,
    fillResolution,
    xInputs,
    yInputs,
    scalesConfig,
    allFrames,
  } = trainPipelineScales({
    normalized,
    options,
    table,
    facetPanels,
    panelFrames,
    freeX,
    freeY,
    editionDefaults,
    warnings,
    advisories,
  });
  perfMark("ggsvelte:scales:end");
  perfMeasure("ggsvelte:scales", "ggsvelte:scales:start", "ggsvelte:scales:end");

  // layout (bounded two-pass; facet grids run the per-panel mirror of it)
  perfMark("ggsvelte:layout:start");
  const panelLayout = computePanelLayout({
    flip,
    faceted,
    freeX,
    freeY,
    nrow,
    ncol,
    facetPanels,
    panelScales,
    allFrames,
    labs: normalized.labs ?? {},
    scalesConfig,
    xScale: xTraining.scale,
    yScale: yTraining.scale,
    colorLegend: colorResolution.legendInput,
    fillLegend: fillResolution.legendInput,
    legendOrder: normalized.legend?.order ?? "stable-domain",
    theme,
    options,
    warnings,
  });
  perfMark("ggsvelte:layout:end");
  perfMeasure("ggsvelte:layout", "ggsvelte:layout:start", "ggsvelte:layout:end");

  // geometry (panel-local px; coord flip transforms per batch).
  // LAYER-major order: layer order is paint order across the whole plot, and
  // it keeps each layer's batches contiguous so strata planning (contiguous
  // same-backend batches share a stratum) never fragments on facet panels.
  perfMark("ggsvelte:geometry:start");
  const batches = buildGeometryBatches({
    layerCount: normalized.layers.length,
    facetPanels,
    panelFrames,
    placements: panelLayout.placements,
    panelScales,
    color: colorResolution.resolved,
    fill: fillResolution.resolved,
    flip,
    warnings,
  });
  perfMark("ggsvelte:geometry:end");
  perfMeasure("ggsvelte:geometry", "ggsvelte:geometry:start", "ggsvelte:geometry:end");

  const scene = assembleScene({
    width: options.width,
    height: options.height,
    placements: panelLayout.placements,
    facetPanels,
    displayScales: panelLayout.displayScales,
    hTitle: panelLayout.hTitle,
    vTitle: panelLayout.vTitle,
    batches,
    legendBlock: panelLayout.legendBlock,
    topBand: panelLayout.topBand,
    theme,
    title: panelLayout.title,
    subtitle: panelLayout.subtitle,
    caption: panelLayout.caption,
  });

  const layerBackends = resolveLayerBackends(
    normalized.layers,
    batches,
    normalized.a11y,
    options.canvasThreshold,
    advisories,
  );
  const layerFields = resolveLayerFields(normalized.layers.length, bindings);
  const layerScaledConstants = resolveLayerScaledConstants(normalized.layers.length, bindings);

  const state: Record<string, ScaleState> = {};
  if (colorResolution.state !== null) state["color"] = colorResolution.state;
  if (fillResolution.state !== null) state["fill"] = fillResolution.state;

  const effectiveDomains: ScaleDomainSnapshot = Object.freeze({
    x: scaleDomainSnapshot(xTraining.scale),
    y: scaleDomainSnapshot(yTraining.scale),
    panels: Object.freeze(
      panelScales.map((panel) =>
        Object.freeze({ x: scaleDomainSnapshot(panel.x), y: scaleDomainSnapshot(panel.y) }),
      ),
    ),
  });
  let baselineDomains = options.baselineDomains;
  if (baselineDomains === undefined && options.baselineScales !== undefined) {
    const baselineX = trainAxis("x", xInputs, options.baselineScales.x).scale;
    const baselineY = trainAxis("y", yInputs, options.baselineScales.y).scale;
    const baselinePanels = facetPanels.map((_, panelIndex) => {
      let x = baselineX;
      let y = baselineY;
      const scratch: Advisory[] = [];
      if (freeX) {
        const inputs = collectAxisInputs(
          "x",
          panelFrames[panelIndex]!,
          options.baselineScales?.x?.type,
          scratch,
        );
        x = trainAxis("x", inputs, {
          ...options.baselineScales?.x,
          type: baselineX.type,
        }).scale;
      }
      if (freeY) {
        const inputs = collectAxisInputs(
          "y",
          panelFrames[panelIndex]!,
          options.baselineScales?.y?.type,
          scratch,
        );
        y = trainAxis("y", inputs, {
          ...options.baselineScales?.y,
          type: baselineY.type,
        }).scale;
      }
      return Object.freeze({ x: scaleDomainSnapshot(x), y: scaleDomainSnapshot(y) });
    });
    baselineDomains = Object.freeze({
      x: scaleDomainSnapshot(baselineX),
      y: scaleDomainSnapshot(baselineY),
      panels: Object.freeze(baselinePanels),
    });
  }
  baselineDomains ??= effectiveDomains;

  const lineage = new LineageStore<number>();
  const candidates = buildPipelineCandidates({
    scene,
    runId,
    flip,
    bindings,
    panelFrames,
    facetPanels,
    table,
    layerFields,
    color: colorResolution.resolved,
    fill: fillResolution.resolved,
    lineage,
  });

  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");

  let disposed = false;
  let retainedTable: ColumnTable | null = table;
  return {
    scene,
    scales: {
      x: xTraining.scale,
      y: yTraining.scale,
      color: colorResolution.resolved,
      fill: fillResolution.resolved,
      panels: panelScales,
      state,
    },
    warnings: dedupeWarnings(warnings),
    advisories: dedupeAdvisories(advisories),
    runId,
    layerBackends,
    layerFields,
    layerScaledConstants,
    domains: Object.freeze({ baseline: baselineDomains, effective: effectiveDomains }),
    lineage,
    candidates,
    axisFormatters: Object.freeze({
      x: makeAxisValueFormatter(xTraining.scale, panelLayout.formatX),
      y: makeAxisValueFormatter(yTraining.scale, panelLayout.formatY),
    }),
    row(index: number): Record<string, CellValue> | null {
      const source = retainedTable;
      if (source === null || index === NO_ROW || index < 0 || index >= source.rowCount) return null;
      const out: Record<string, CellValue> = {};
      for (const field of source.fields) out[field] = source.column(field)[index]!;
      return out;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      candidates.dispose();
      retainedTable = null;
      // Release geometry (typed arrays) and per-panel structures; the bound
      // table and its numeric caches become unreachable with this model.
      scene.batches.length = 0;
      scene.panels.length = 0;
      scene.legends.length = 0;
    },
  };
}
