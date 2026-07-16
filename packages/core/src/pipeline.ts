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

import type { SpecInput, PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "./perf.js";

import type { Advisory, PipelineWarning, RenderModel, RunOptions } from "./pipeline/types.js";
import { setupPipelineRun } from "./pipeline/setup-run.js";
import { preparePanels } from "./pipeline/prepare-panels.js";
import { trainPipelineScales } from "./pipeline/train-pipeline-scales.js";
import { finalizePipelineRun } from "./pipeline/finalize-run.js";

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

  const warnings: PipelineWarning[] = [];
  const advisories: Advisory[] = [];

  const { normalized, editionDefaults, theme, flip } = setupPipelineRun(
    spec,
    options.editions,
    warnings,
  );

  // bind + facet partition + per-panel frames
  perfMark("ggsvelte:bind:start");
  const prepared = preparePanels(normalized, options, warnings, advisories);
  perfMark("ggsvelte:bind:end");
  perfMeasure("ggsvelte:bind", "ggsvelte:bind:start", "ggsvelte:bind:end");

  // train scales — fixed: union across panels; free: positional domains per
  // panel; discrete color/fill assignment ALWAYS global (one legend).
  perfMark("ggsvelte:scales:start");
  const trained = trainPipelineScales({
    normalized,
    options,
    table: prepared.table,
    facetPanels: prepared.facetPanels,
    panelFrames: prepared.panelFrames,
    freeX: prepared.freeX,
    freeY: prepared.freeY,
    editionDefaults,
    warnings,
    advisories,
  });
  perfMark("ggsvelte:scales:end");
  perfMeasure("ggsvelte:scales", "ggsvelte:scales:start", "ggsvelte:scales:end");

  const model = finalizePipelineRun({
    runId,
    normalized,
    options,
    theme,
    flip,
    prepared,
    trained,
    warnings,
    advisories,
  });

  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");
  return model;
}
