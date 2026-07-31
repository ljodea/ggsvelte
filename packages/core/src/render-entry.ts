/**
 * Lean render entry (`@ggsvelte/core/render`).
 *
 * Pipeline + SVG string renderer with basic geom registration only.
 * Does not register heavy stats (smooth/loess, density_2d, sf, …) or specialty
 * geoms. Identity charts (scatter, line, bar, area) stay on this graph.
 *
 * Full grammar: import from `@ggsvelte/core` instead.
 *
 * Lifecycle (Hadley lesson 13; meanings in CONTRIBUTING.md): tags collected
 * into lifecycle.json by scripts/gen-lifecycle.ts.
 */
// @lifecycle-default experimental
import "./pipeline/geometry-register-basic.js";
import "./pipeline/frame-stats-register-basic.js";

export { batchMarkCount, CANVAS_AUTO_THRESHOLD, PipelineError } from "./pipeline/public-api.js";
export { runPipeline } from "./pipeline/run-pipeline.js";
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
  ScaleDecision,
  ScaleDiagnostic,
  ScaleDiagnosticFix,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./pipeline/public-api.js";

export {
  countMarks,
  pathData,
  renderToSVGString,
  sceneLabel,
  sceneToSVGString,
} from "./render-svg.js";
export type { RenderSVGOptions } from "./render-svg.js";

export type {
  GeometryBatch,
  GlyphsBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SceneAxis,
  SceneDiscreteLegend,
  SceneLegend,
  SceneLegendEntry,
  ScenePanel,
  SceneRampLegend,
  SceneStepsLegend,
  SceneTick,
  SegmentsBatch,
} from "./scene.js";

export { registerStatFrame } from "./pipeline/frame-stats-registry.js";
export { registerGeomBatch } from "./pipeline/geometry-registry.js";
