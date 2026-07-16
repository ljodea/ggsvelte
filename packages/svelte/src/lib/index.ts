// ggsvelte — Svelte 5 adapter. Props-first API (<GGPlot spec/props>);
// declaration-only children (<GeomPoint>/<GeomBar>/...) are optional sugar
// (decision 0001, mechanism A). Re-exports the spec/core surface so
// `bun add @ggsvelte/svelte` gets everything. Owns the `ggsvelte-render` CLI bin
// (bin/ggsvelte-render.js, wrapping @ggsvelte/core's runCLI).
//
// Lifecycle (Hadley lesson 13; meanings in CONTRIBUTING.md): tags collected
// into lifecycle.json by scripts/gen-lifecycle.ts.
// @lifecycle-default experimental
/* oxlint-disable typescript/no-deprecated -- migration aliases intentionally remain public */

// Components
/** @lifecycle stable-intent */
export { default as GGPlot } from "./GGPlot.svelte";
export { default as Tooltip } from "./Tooltip.svelte";
export type {
  LegendFilterClause,
  LegendFilterEvent,
  LegendFilterInput,
  LegendFilterOptions,
} from "./legend-filter.js";
export { createPlotInteraction } from "./interaction-controller.svelte.js";
export type {
  CreatePlotInteractionOptions,
  PlotInteractionController,
  PlotInteractionMutationOptions,
  PlotInteractionZoomOptions,
} from "./interaction-controller.svelte.js";
export { INTERACTION_DIAGNOSTIC_CATALOG, normalizeInteractionConfig } from "./interaction.js";
export type {
  AreaMode,
  BrushSelection,
  FacetIntervalPreset,
  InspectInput,
  InspectMode,
  InspectOptions,
  InteractionDiagnostic,
  InteractionDiagnosticCode,
  InteractionSource,
  InteractionTool,
  IntervalSelection,
  LegendFocusChange,
  LegendFocusClear,
  LegendFocusEvent,
  LegendFocusInput,
  LegendFocusOptions,
  NonEmptyReadonlyArray,
  PlotDatum,
  PlotInspection,
  PlotInspectionChange,
  PlotInspectionClear,
  PlotInteractionEvent,
  PlotInteractionChange,
  PlotInteractionInterval,
  PlotInteractionScope,
  PlotInteractionSnapshot,
  PlotInteractionTransition,
  PlotSelection,
  PointSelection,
  ReadonlyZoomDomains,
  ReadonlyIntervalDomains,
  ResolvedInspectMode,
  ResolvedInteractionConfig,
  SelectInput,
  SelectOptions,
  ScopedInteractionDomain,
  ScopedInteractionInterval,
  ScopedInteractionKeys,
  SemanticIntervalAxis,
  TooltipContext,
  TooltipField,
  ZoomDomains,
  ZoomEvent,
  ZoomInput,
  ZoomOptions,
} from "./interaction.js";
export { default as GeomPoint } from "./GeomPoint.svelte";
export { default as GeomLine } from "./GeomLine.svelte";
export { default as GeomCol } from "./GeomCol.svelte";
export { default as GeomBar } from "./GeomBar.svelte";
export { default as GeomArea } from "./GeomArea.svelte";
export { default as GeomRule } from "./GeomRule.svelte";
export { default as GeomText } from "./GeomText.svelte";
export { default as GeomHistogram } from "./GeomHistogram.svelte";
export { default as GeomSmooth } from "./GeomSmooth.svelte";
export { default as GeomBoxplot } from "./GeomBoxplot.svelte";
export { default as GeomDensity } from "./GeomDensity.svelte";
export { default as GeomErrorbar } from "./GeomErrorbar.svelte";
export { registerLayer } from "./registry.svelte.js";
export type { LayerDescriptor, LayerRegistry } from "./registry.svelte.js";
export { createGeomLayer } from "./geom-factory.svelte.js";
export type { GeomProps } from "./geom-factory.svelte.js";

// Spec surface (builder + canonicalizer + validation)
export {
  aes,
  gg,
  GGBuilder,
  isPortable,
  lintSpec,
  normalize, // @lifecycle stable-intent
  SpecValidationError, // @lifecycle stable-intent
  toPortable,
  toPortableLossy,
  validate, // @lifecycle stable-intent
} from "@ggsvelte/spec";
export type {
  A11yMode,
  Aes,
  AesInput,
  ChannelValue,
  ColorScaleSpec,
  CoordSpec,
  DataInput,
  BoxplotParams,
  DataProfile,
  DataRef,
  DensityParams,
  FacetInput,
  FacetScales,
  FacetSpec,
  ErrorbarParams,
  Labs,
  LayerInput,
  LayerSpec,
  LegendSpec,
  PointPosition,
  PortableSpec, // @lifecycle stable-intent
  PositionParams,
  PositionScaleSpec,
  RenderBackend,
  RuntimeSpec,
  Scales,
  SmoothParams,
  SpecAdvisory,
  SpecError,
  SpecInput,
  StackablePosition,
  ThemeName,
  ThemeSpec,
  ValidateResult,
} from "@ggsvelte/spec";

// Core surface (pure renderer + pipeline)
export {
  PipelineError,
  planStrata,
  renderToSVGString, // @lifecycle stable-intent
  runPipeline,
} from "@ggsvelte/core";
export type {
  Advisory,
  LayerBackend,
  MappedField,
  PipelineWarning,
  RenderModel,
  RenderSVGOptions,
  ResolvedColorScale,
  RunOptions,
  ScaleState,
  Scene,
  Stratum,
  ThemeTokens,
} from "@ggsvelte/core";
