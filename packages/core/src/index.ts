// @ggsvelte/core — PURE entrypoint: pipeline + SVG-string renderer +
// metrics-table measurer. Importable in Node/edge/workers with no DOM
// globals (enforced by the Node smoke test). Dependency direction (plan):
// spec <- core <- svelte. The DOM half (canvas renderer, browser measurer)
// lives behind "@ggsvelte/core/dom".
//
// Lifecycle (Hadley lesson 13; meanings in CONTRIBUTING.md): tags collected
// into lifecycle.json by scripts/gen-lifecycle.ts.
// @lifecycle-default experimental

// Data binding
export {
  cellsToNumeric,
  cellToNumber,
  ColumnTable,
  discretenessOf,
  inferFieldType,
  isISODateString,
} from "./table.js";
export type { CellValue, Columns, Discreteness, FieldType, Rows } from "./table.js";

// Grouping (decision 0005)
export { deriveGroups, inferDiscreteness } from "./grouping.js";
export type { AesMapping, DeclaredDiscreteness, GroupDerivation } from "./grouping.js";

// Stats + positions
export { statCount } from "./stats/count.js";
export type { CountStatInput, CountStatResult } from "./stats/count.js";
export { positionDodge, positionStack } from "./positions/positions.js";
export type { DodgeInput, DodgeResult, StackInput, StackResult } from "./positions/positions.js";

// Scale state + training (decision 0002)
export {
  adoptScaleState,
  decodeKey,
  encodeKey,
  fnv1a,
  freshScaleState,
  PaletteExhaustedError,
  paletteFingerprint,
  SCALE_STATE_VERSION,
  serializeScaleState,
  trainDiscrete,
} from "./scales/state.js";
export type {
  DiscreteScaleSpec,
  ScaleState,
  ScaleWarning,
  ScaleWarningCode,
  TrainMode,
  TrainResult,
} from "./scales/state.js";
export {
  bandKey,
  CATEGORICAL_PALETTE_10,
  finiteExtent,
  niceLinearDomain,
  ScaleConfigError,
  trainBand,
  trainColor,
  trainContinuous,
  trainLinear,
} from "./scales/train.js";
export type {
  BandConfig,
  BandScale,
  ColorScale,
  ContinuousConfig,
  ContinuousScale,
  ContinuousTraining,
  OrdinalColorConfig,
  PositionScale,
} from "./scales/train.js";
export { rampColor, trainSequential, VIRIDIS_RAMP_10 } from "./scales/color.js";
export type { SequentialColorScale, SequentialConfig } from "./scales/color.js";

// Theme registry
export { BUILTIN_THEMES, resolveTheme, themeVar, UnknownThemeError } from "./theme.js";
export type { ThemeTokens } from "./theme.js";

// Defaults editions (Hadley lesson 13; normalize() stamps spec.edition)
export { EDITION_DEFAULTS, resolveEditionDefaults } from "./editions.js";
export type { EditionDefaults, ResolvedEdition } from "./editions.js";

// Diagnostics catalog (render-time errors/warnings/advisories — docs render from it)
export {
  ADVISORY_CATALOG,
  CLI_DIAGNOSTIC_CATALOG,
  PIPELINE_ERROR_CATALOG,
  PIPELINE_WARNING_CATALOG,
} from "./diagnostics.js";
export type {
  AdvisoryCode,
  CLIDiagnosticCode,
  PipelineErrorCatalogEntry,
  PipelineErrorCode,
  PipelineWarningCode,
} from "./diagnostics.js";

// Layout (decision 0003)
export { DEFAULT_FONT_STACK, MetricsTableMeasurer } from "./layout/measure.js";
export type { MetricsTable, TextMeasurer } from "./layout/measure.js";
export { FONT_METRICS } from "./layout/font-metrics.js";
export {
  defaultLogTickFormat,
  defaultTickFormat,
  linearTicks,
  logTicks,
  tickStep,
} from "./layout/ticks.js";
export { defaultTimeTickFormat, timeTicks } from "./layout/time.js";
export type { TimeTicksResult } from "./layout/time.js";
export { formatTime, numberFormatter } from "./layout/format.js";
export type { NumberFormatter } from "./layout/format.js";
export { DEFAULT_LAYOUT_THEME, layout, layoutPass, marginDelta } from "./layout/layout.js";
export type {
  AxisResult,
  Domain,
  LayoutInput,
  LayoutResult,
  LayoutTheme,
  Margins,
  PassResult,
  Tick,
  TickFormatter,
} from "./layout/layout.js";

// Legends
export { buildLegends } from "./legend.js";
export type {
  DiscreteLegendInput,
  LegendBlock,
  LegendInput,
  LegendOrder,
  RampLegendInput,
} from "./legend.js";

// Pipeline
export { batchMarkCount, CANVAS_AUTO_THRESHOLD, PipelineError, runPipeline } from "./pipeline.js";
export type {
  Advisory,
  LayerBackend,
  MappedField,
  NamedData,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  RunOptions,
  TrainedScales,
} from "./pipeline.js";
export { PANEL_SPACING, STRIP_BAND } from "./scene.js";
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
  SceneTick,
  SegmentsBatch,
} from "./scene.js";

// Strata planning (pure — the DOM adapter builds the stratum elements)
export { planStrata } from "./strata.js";
export type { Stratum } from "./strata.js";

// SVG renderer (pure)
export {
  countMarks,
  pathData,
  renderToSVGString, // @lifecycle stable-intent
  sceneLabel,
  sceneToSVGString,
} from "./render-svg.js";
/** @lifecycle stable-intent */
export type { RenderSVGOptions } from "./render-svg.js";

// CLI implementation (the `ggsvelte-render` bin on the ggsvelte package wraps this)
export { runCLI } from "./cli.js";
export type { CLIIO } from "./cli.js";

// Instrumentation
export { perfMark, perfMeasure } from "./perf.js";
