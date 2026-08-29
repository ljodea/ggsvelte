// @ggsvelte/react — React DOM adapter. Props-first API; declaration-only
// children are optional sugar. Re-exports spec/core so one install is enough.
// @lifecycle-default experimental

import "./host-init.js";

export { GGPlot } from "./GGPlot.js";
export type { GGPlotHandle, GGPlotProps } from "./plot-props.js";
export { createPlotInteraction } from "./interaction.js";
export type {
  AreaMode,
  ControllerDatumIdentity,
  CreatePlotInteractionOptions,
  InspectInput,
  InspectMode,
  InspectOptions,
  InteractionSource,
  InteractionTool,
  NonEmptyReadonlyArray,
  PlotDatum,
  PlotInspection,
  PlotInspectionChange,
  PlotInspectionClear,
  PlotInteractionChange,
  PlotInteractionController,
  PlotInteractionEvent,
  PlotInteractionMutationOptions,
  PlotInteractionScope,
  PlotInteractionSnapshot,
  PlotInteractionTransition,
  PlotInteractionZoomOptions,
  PlotSelection,
  PointSelection,
  ReadonlyZoomDomains,
  SelectInput,
  SelectOptions,
  TooltipField,
  ZoomDomains,
  ZoomEvent,
  ZoomInput,
  ZoomOptions,
} from "./interaction.js";

export {
  Coord,
  CoordFixed,
  CoordFlip,
  CoordPolar,
  CoordRadial,
  CoordSf,
  Facet,
  FacetGrid,
  FacetWrap,
  GuideAxis,
  GuideColorbar,
  GuideColorsteps,
  GuideLegend,
  GuideNone,
  Guides,
  Inspect,
  Labs,
  Legend,
  Scale,
  Theme,
} from "./grammar.js";

export * from "./geoms/index.js";
export * from "./scales.js";
export * from "./themes.js";

export {
  assemblePortableSpec,
  isFacetedPlotIntent,
  resolveInteractionScope,
  toLayerInput,
} from "@ggsvelte/compose";

export { aes, gg, normalize, validate, lintSpec, toPortable, isPortable } from "@ggsvelte/spec";
export type { AesInput, LayerInput, PortableSpec, SpecInput } from "@ggsvelte/spec";

export {
  installTemporal,
  planStrata,
  registerAbline,
  registerAll,
  registerAlign,
  registerBasic,
  registerBin,
  registerBin2d,
  registerBoxplot,
  registerConnect,
  registerContour,
  registerCrossbar,
  registerCurve,
  registerDensity,
  registerDensity2d,
  registerDensity2dFilled,
  registerDotplot,
  registerEcdf,
  registerEllipse,
  registerErrorbar,
  registerFunction,
  registerHex,
  registerLinerange,
  registerManual,
  registerMap,
  registerPointrange,
  registerPolygon,
  registerQq,
  registerQqLine,
  registerQuantile,
  registerRaster,
  registerRug,
  registerSf,
  registerSfLabel,
  registerSfText,
  registerSmooth,
  registerSpoke,
  registerSummary,
  registerSummaryBin,
  registerSummaryRolling,
  registerTile,
  registerUnique,
  registerViolin,
  renderToSVGString,
  runPipeline,
} from "@ggsvelte/core";
export type { RenderModel, RunOptions, Scene, ScaleState, Stratum } from "@ggsvelte/core";
