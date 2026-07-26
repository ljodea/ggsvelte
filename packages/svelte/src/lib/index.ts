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
export { default as Tooltip } from "./inspection/Tooltip.svelte";
export type {
  LegendFilterClause,
  LegendFilterEvent,
  LegendFilterInput,
  LegendFilterOptions,
} from "./legend/filter.js";
export { createPlotInteraction } from "./interaction/controller.svelte.js";
export type {
  CreatePlotInteractionOptions,
  PlotInteractionController,
  PlotInteractionMutationOptions,
  PlotInteractionZoomOptions,
} from "./interaction/controller.svelte.js";
export {
  INTERACTION_DIAGNOSTIC_CATALOG,
  normalizeInteractionConfig,
} from "./interaction/interaction.js";
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
} from "./interaction/interaction.js";
export { default as GeomPoint } from "./geoms/GeomPoint.svelte";
export { default as GeomLine } from "./geoms/GeomLine.svelte";
export { default as GeomPath } from "./geoms/GeomPath.svelte";
export { default as GeomCol } from "./geoms/GeomCol.svelte";
export { default as GeomBar } from "./geoms/GeomBar.svelte";
export { default as GeomArea } from "./geoms/GeomArea.svelte";
export { default as GeomRule } from "./geoms/GeomRule.svelte";
export { default as GeomText } from "./geoms/GeomText.svelte";
export { default as GeomHistogram } from "./geoms/GeomHistogram.svelte";
export { default as GeomFreqpoly } from "./geoms/GeomFreqpoly.svelte";
export { default as GeomSmooth } from "./geoms/GeomSmooth.svelte";
export { default as GeomQuantile } from "./geoms/GeomQuantile.svelte";
export { default as GeomBoxplot } from "./geoms/GeomBoxplot.svelte";
export { default as GeomDensity } from "./geoms/GeomDensity.svelte";
export { default as GeomErrorbar } from "./geoms/GeomErrorbar.svelte";
export { default as GeomRect } from "./geoms/GeomRect.svelte";
export { default as GeomTile } from "./geoms/GeomTile.svelte";
export { default as GeomRaster } from "./geoms/GeomRaster.svelte";
export { default as GeomRibbon } from "./geoms/GeomRibbon.svelte";
export { default as GeomSegment } from "./geoms/GeomSegment.svelte";
export { registerLayer, registerPlotLayer } from "./geoms/registry.svelte.js";
export type {
  Layer,
  LayerDescriptor,
  LayerRegistry,
  MarkLayerDescriptor,
} from "./geoms/registry.svelte.js";
export { createGeomLayer } from "./geoms/factory.svelte.js";
export type { GeomProps } from "./geoms/factory.svelte.js";

// Theme children (#659 slice 2) — stable-intent: 1:1 mirror of ThemeSpec /
// THEME_NAMES; destination for the deprecated `theme` prop (since 0.11.0).
/** @lifecycle stable-intent */
export { default as Theme } from "./theme/Theme.svelte";
/** @lifecycle stable-intent */
export { default as ThemeDefault } from "./theme/ThemeDefault.svelte";
/** @lifecycle stable-intent */
export { default as ThemeLight } from "./theme/ThemeLight.svelte";
/** @lifecycle stable-intent */
export { default as ThemeDark } from "./theme/ThemeDark.svelte";
/** @lifecycle stable-intent */
export { default as ThemeMinimal } from "./theme/ThemeMinimal.svelte";
/** @lifecycle stable-intent */
export { default as ThemeGgplot2 } from "./theme/ThemeGgplot2.svelte";
/** @lifecycle stable-intent */
export { default as ThemeClassic } from "./theme/ThemeClassic.svelte";
/** @lifecycle stable-intent */
export { default as ThemeBw } from "./theme/ThemeBw.svelte";
/** @lifecycle stable-intent */
export { default as ThemeHrbr } from "./theme/ThemeHrbr.svelte";
/** @lifecycle stable-intent */
export { default as ThemeFew } from "./theme/ThemeFew.svelte";
/** @lifecycle stable-intent */
export { default as ThemeClean } from "./theme/ThemeClean.svelte";
/** @lifecycle stable-intent */
export { default as ThemeFivethirtyeight } from "./theme/ThemeFivethirtyeight.svelte";
/** @lifecycle stable-intent */
export { default as ThemeEconomist } from "./theme/ThemeEconomist.svelte";
/** @lifecycle stable-intent */
export { default as ThemeTufte } from "./theme/ThemeTufte.svelte";
/** @lifecycle stable-intent */
export { default as ThemeLinedraw } from "./theme/ThemeLinedraw.svelte";
/** @lifecycle stable-intent */
export { default as ThemeGrey } from "./theme/ThemeGrey.svelte";
/** @lifecycle stable-intent */
export { default as ThemeGray } from "./theme/ThemeGray.svelte";
/** @lifecycle stable-intent */
export { default as ThemeTest } from "./theme/ThemeTest.svelte";

// Scale children (#659) — stable-intent shells for every SCALE_CAPABILITIES
// family + <Scale> escape hatch; destination for the deprecated `scales` prop
// (since 0.11.0). Generated shells live between the markers; run
// `bun run scale:children:gen` to regenerate. Colour aliases re-export Color.
/** @lifecycle stable-intent */
export { default as Scale } from "./scale/Scale.svelte";
// <generated:scale-children> — bun run scale:children:gen
/** @lifecycle stable-intent */
export { default as ScaleXContinuous } from "./scale/ScaleXContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYContinuous } from "./scale/ScaleYContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXLog10 } from "./scale/ScaleXLog10.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYLog10 } from "./scale/ScaleYLog10.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXSqrt } from "./scale/ScaleXSqrt.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYSqrt } from "./scale/ScaleYSqrt.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXReverse } from "./scale/ScaleXReverse.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYReverse } from "./scale/ScaleYReverse.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXBinned } from "./scale/ScaleXBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYBinned } from "./scale/ScaleYBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXDate } from "./scale/ScaleXDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXDatetime } from "./scale/ScaleXDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYDate } from "./scale/ScaleYDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYDatetime } from "./scale/ScaleYDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleXDiscrete } from "./scale/ScaleXDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleYDiscrete } from "./scale/ScaleYDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorContinuous } from "./scale/ScaleColorContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorDiscrete } from "./scale/ScaleColorDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorBinned } from "./scale/ScaleColorBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorGradient } from "./scale/ScaleColorGradient.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorGradient2 } from "./scale/ScaleColorGradient2.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorGradientn } from "./scale/ScaleColorGradientn.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorHue } from "./scale/ScaleColorHue.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorGrey } from "./scale/ScaleColorGrey.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorOrdinal } from "./scale/ScaleColorOrdinal.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorLog10 } from "./scale/ScaleColorLog10.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorSqrt } from "./scale/ScaleColorSqrt.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorDate } from "./scale/ScaleColorDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorDatetime } from "./scale/ScaleColorDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorManual } from "./scale/ScaleColorManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColorIdentity } from "./scale/ScaleColorIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillContinuous } from "./scale/ScaleFillContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillDiscrete } from "./scale/ScaleFillDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillBinned } from "./scale/ScaleFillBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillGradient } from "./scale/ScaleFillGradient.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillGradient2 } from "./scale/ScaleFillGradient2.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillGradientn } from "./scale/ScaleFillGradientn.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillHue } from "./scale/ScaleFillHue.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillGrey } from "./scale/ScaleFillGrey.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillOrdinal } from "./scale/ScaleFillOrdinal.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillLog10 } from "./scale/ScaleFillLog10.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillSqrt } from "./scale/ScaleFillSqrt.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillDate } from "./scale/ScaleFillDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillDatetime } from "./scale/ScaleFillDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillManual } from "./scale/ScaleFillManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleFillIdentity } from "./scale/ScaleFillIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeContinuous } from "./scale/ScaleSizeContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeDiscrete } from "./scale/ScaleSizeDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeBinned } from "./scale/ScaleSizeBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeDate } from "./scale/ScaleSizeDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeDatetime } from "./scale/ScaleSizeDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeManual } from "./scale/ScaleSizeManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleSizeIdentity } from "./scale/ScaleSizeIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthContinuous } from "./scale/ScaleLinewidthContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthDiscrete } from "./scale/ScaleLinewidthDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthBinned } from "./scale/ScaleLinewidthBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthDate } from "./scale/ScaleLinewidthDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthDatetime } from "./scale/ScaleLinewidthDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthManual } from "./scale/ScaleLinewidthManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinewidthIdentity } from "./scale/ScaleLinewidthIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaContinuous } from "./scale/ScaleAlphaContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaDiscrete } from "./scale/ScaleAlphaDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaBinned } from "./scale/ScaleAlphaBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaDate } from "./scale/ScaleAlphaDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaDatetime } from "./scale/ScaleAlphaDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaManual } from "./scale/ScaleAlphaManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleAlphaIdentity } from "./scale/ScaleAlphaIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleShapeDiscrete } from "./scale/ScaleShapeDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleShapeBinned } from "./scale/ScaleShapeBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleShapeManual } from "./scale/ScaleShapeManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleShapeIdentity } from "./scale/ScaleShapeIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinetypeDiscrete } from "./scale/ScaleLinetypeDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinetypeBinned } from "./scale/ScaleLinetypeBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinetypeManual } from "./scale/ScaleLinetypeManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleLinetypeIdentity } from "./scale/ScaleLinetypeIdentity.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourContinuous } from "./scale/ScaleColorContinuous.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourDiscrete } from "./scale/ScaleColorDiscrete.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourBinned } from "./scale/ScaleColorBinned.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourGradient } from "./scale/ScaleColorGradient.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourGradient2 } from "./scale/ScaleColorGradient2.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourGradientn } from "./scale/ScaleColorGradientn.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourHue } from "./scale/ScaleColorHue.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourGrey } from "./scale/ScaleColorGrey.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourOrdinal } from "./scale/ScaleColorOrdinal.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourLog10 } from "./scale/ScaleColorLog10.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourSqrt } from "./scale/ScaleColorSqrt.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourDate } from "./scale/ScaleColorDate.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourDatetime } from "./scale/ScaleColorDatetime.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourManual } from "./scale/ScaleColorManual.svelte";
/** @lifecycle stable-intent */
export { default as ScaleColourIdentity } from "./scale/ScaleColorIdentity.svelte";
// </generated:scale-children>

// Coord children (#659 slice 5) — stable-intent: named shells + <Coord>
// escape hatch; destination for the deprecated `coord` prop (since 0.11.0).
/** @lifecycle stable-intent */
export { default as Coord } from "./coord/Coord.svelte";
/** @lifecycle stable-intent */
export { default as CoordFlip } from "./coord/CoordFlip.svelte";
/** @lifecycle stable-intent */
export { default as CoordCartesian } from "./coord/CoordCartesian.svelte";
/** @lifecycle stable-intent */
export { default as CoordTransform } from "./coord/CoordTransform.svelte";
/** @lifecycle stable-intent */
export { default as CoordFixed } from "./coord/CoordFixed.svelte";
/** @lifecycle stable-intent */
export { default as CoordEqual } from "./coord/CoordFixed.svelte";

// Facet children (#659 slice 5) — stable-intent: complete <Facet> surface +
// ggplot2-spelling shells; destination for the deprecated `facet` prop.
/** @lifecycle stable-intent */
export { default as Facet } from "./facet/Facet.svelte";
/** @lifecycle stable-intent */
export { default as FacetWrap } from "./facet/FacetWrap.svelte";
/** @lifecycle stable-intent */
export { default as FacetGrid } from "./facet/FacetGrid.svelte";

// Labs child (#659 slice 6) — stable-intent: the whole flat Labs surface as
// named props; destination for the deprecated `labs` prop (since 0.11.0).
// No <Labs value> escape hatch — `<Labs {...computed} />` already covers it.
/** @lifecycle stable-intent */
export { default as Labs } from "./labs/Labs.svelte";
// Name collision, resolved in favour of the component: every grammar child is
// named for the PortableSpec field it fills (Theme, Scale, Coord, Facet,
// Guides, Legend), and Labs is the only spec type without a Spec/Input suffix.
// So <Labs> keeps the bare name here and the type is re-exported as LabsSpec.
// `import type { Labs } from "@ggsvelte/spec"` is unchanged and still canonical.
export type { Labs as LabsSpec } from "@ggsvelte/spec";

// Guide children (#659 slice 6) — stable-intent: one shell per guide TYPE,
// each keyed by a `channel` prop (the aesthetic is a key, not a helper), plus
// the <Guides value> escape hatch. Destination for the deprecated `guides` prop.
/** @lifecycle stable-intent */
export { default as Guides } from "./guides/Guides.svelte";
/** @lifecycle stable-intent */
export { default as GuideAxis } from "./guides/GuideAxis.svelte";
/** @lifecycle stable-intent */
export { default as GuideLegend } from "./guides/GuideLegend.svelte";
/** @lifecycle stable-intent */
export { default as GuideColorbar } from "./guides/GuideColorbar.svelte";
/** @lifecycle stable-intent */
export { default as GuideColorsteps } from "./guides/GuideColorsteps.svelte";
/** @lifecycle stable-intent */
export { default as GuideNone } from "./guides/GuideNone.svelte";
/** @lifecycle stable-intent */
export type {
  GuideChannel,
  NonPositionGuideChannel,
  PositionGuideChannel,
} from "./guides/factory.svelte.js";

// Legend child (#659 slice 6) — stable-intent: the plot-wide entry-SORT enum.
// Not the per-aesthetic placement rank; that is <GuideLegend order={…}/>.
/** @lifecycle stable-intent */
export { default as Legend } from "./legend/Legend.svelte";

// Deprecation + composition diagnostics (sibling unions to InteractionDiagnostic)
export {
  DEPRECATION_DIAGNOSTIC_CATALOG,
  deprecatedPropDiagnostic,
  isDeprecationDiagnostic,
} from "./diagnostics/deprecation.js";
export type {
  DeprecationDiagnostic,
  DeprecationDiagnosticCode,
  PlotDiagnostic,
} from "./diagnostics/deprecation.js";
export {
  COMPOSITION_DIAGNOSTIC_CATALOG,
  duplicateMergeKeyDiagnostic,
  duplicatePlotLayerDiagnostic,
  duplicateScaleChannelDiagnostic,
  isCompositionDiagnostic,
  isDuplicateMergeKeyDiagnostic,
  isDuplicatePlotLayerDiagnostic,
  isDuplicateScaleChannelDiagnostic,
} from "./diagnostics/composition.js";
export type {
  CompositionDiagnostic,
  CompositionDiagnosticCode,
  DuplicateMergeKeyDiagnostic,
  DuplicateMergeKeyKind,
  DuplicatePlotLayerDiagnostic,
  DuplicatePlotLayerKind,
  DuplicateScaleChannelDiagnostic,
} from "./diagnostics/composition.js";

// Spec surface (builder + canonicalizer + validation)
export {
  aes,
  gg,
  GGBuilder,
  coord_equal,
  coord_fixed,
  coord_transform,
  coordEqual,
  coordFixed,
  coordTransform,
  isPortable,
  lintSpec,
  normalize, // @lifecycle stable-intent
  dmy,
  dmy_hm,
  dmy_hms,
  dym,
  dym_hm,
  dym_hms,
  fromEpochMilliseconds,
  fromEpochSeconds,
  mdy,
  mdy_hm,
  mdy_hms,
  my,
  myd,
  myd_hm,
  myd_hms,
  parseTemporalFormat,
  parseTemporalInterval,
  MAX_TEMPORAL_CANDIDATES,
  MAX_TEMPORAL_MAJOR_TICKS,
  MAX_TEMPORAL_MINOR_TICKS,
  MIN_TEMPORAL_LABEL_GAP_PX,
  TEMPORAL_INTERVAL_UNITS,
  TEMPORAL_LABEL_TOKENS,
  TEMPORAL_WEEKDAYS,
  temporalIntervalTicks,
  scaleColorBinned,
  scaleColorContinuous,
  scaleColorDate,
  scaleColorDatetime,
  scaleColorDiscrete,
  scaleColorIdentity,
  scaleColorLog10,
  scaleColorManual,
  scaleColorSqrt,
  scaleContinuousIdentity,
  scaleDiscreteIdentity,
  scaleDiscreteManual,
  scaleType,
  scale_continuous_identity,
  scale_discrete_identity,
  scale_discrete_manual,
  scale_type,
  scaleColourBinned,
  scaleColourContinuous,
  scaleColourDate,
  scaleColourDatetime,
  scaleColourDiscrete,
  scaleColourIdentity,
  scaleColourLog10,
  scaleColourManual,
  scaleColourSqrt,
  scaleFillBinned,
  scaleFillContinuous,
  scaleFillDate,
  scaleFillDatetime,
  scaleFillDiscrete,
  scaleFillIdentity,
  scaleFillLog10,
  scaleFillManual,
  scaleFillSqrt,
  scale_color_binned,
  scale_color_continuous,
  scale_color_date,
  scale_color_datetime,
  scale_color_discrete,
  scale_color_identity,
  scale_color_log10,
  scale_color_manual,
  scale_color_sqrt,
  scale_colour_binned,
  scale_colour_continuous,
  scale_colour_date,
  scale_colour_datetime,
  scale_colour_discrete,
  scale_colour_identity,
  scale_colour_log10,
  scale_colour_manual,
  scale_colour_sqrt,
  scale_fill_binned,
  scale_fill_continuous,
  scale_fill_date,
  scale_fill_datetime,
  scale_fill_discrete,
  scale_fill_identity,
  scale_fill_log10,
  scale_fill_manual,
  scale_fill_sqrt,
  scaleXBinned,
  scaleXContinuous,
  scaleXDate,
  scaleXDatetime,
  scaleXDiscrete,
  scaleXLog10,
  scaleXReverse,
  scaleXSqrt,
  scaleYBinned,
  scaleYContinuous,
  scaleYDate,
  scaleYDatetime,
  scaleYDiscrete,
  scaleYLog10,
  scaleYReverse,
  scaleYSqrt,
  scale_x_binned,
  scale_x_continuous,
  scale_x_date,
  scale_x_datetime,
  scale_x_discrete,
  scale_x_log10,
  scale_x_reverse,
  scale_x_sqrt,
  scale_y_binned,
  scale_y_continuous,
  scale_y_date,
  scale_y_datetime,
  scale_y_discrete,
  scale_y_log10,
  scale_y_reverse,
  scale_y_sqrt,
  SCALE_CAPABILITIES,
  guideAxis,
  guideColorbar,
  guideColorsteps,
  guideLegend,
  guideNone,
  guides,
  guide_axis,
  guide_colorbar,
  guide_colorsteps,
  guide_legend,
  guide_none,
  ydm,
  ydm_hm,
  ydm_hms,
  ym,
  ymd,
  ymd_hm,
  ymd_hms,
  yq,
  SpecValidationError, // @lifecycle stable-intent
  toPortable,
  toPortableLossy,
  validate, // @lifecycle stable-intent
} from "@ggsvelte/spec";
export type {
  A11yMode,
  Aes,
  AesInput,
  AuthoringCellValue,
  AuthoringColumns,
  AuthoringDataRef,
  AuthoringRows,
  BinnedColorScaleOptions,
  ChannelValue,
  ColorScaleOptions,
  ColorScaleSpec,
  CoordSpec,
  CoordFixedOptions,
  CoordFixedSpec,
  CoordTransformAxisOptions,
  CoordTransformAxisSpec,
  CoordTransformName,
  CoordTransformOptions,
  CoordTransformSpec,
  DataInput,
  BoxplotParams,
  DataProfile,
  DataRef,
  DensityParams,
  DiscreteColorScaleOptions,
  FacetInput,
  FacetScales,
  FacetSpec,
  ErrorbarParams,
  AxisGuideOptions,
  AxisGuideSpec,
  ColorbarGuideOptions,
  ColorbarGuideSpec,
  ColorstepsGuideOptions,
  ColorstepsGuideSpec,
  GuidesSpec,
  GuideSpec,
  GuideThemeSpec,
  LegendGuideOptions,
  LegendGuideSpec,
  NoneGuideSpec,
  LayerInput,
  LayerSpec,
  LegendSpec,
  PointPosition,
  PortableSpec, // @lifecycle stable-intent
  PositionParams,
  PositionScaleSpec,
  ScaleExpansion,
  ContinuousPositionScaleOptions,
  IdentityColorScaleOptions,
  ManualColorScaleOptions,
  MultiIdentityScaleOptions,
  MultiManualScaleOptions,
  MultiScaleAesthetic,
  MultiScaleChannel,
  RecommendedScaleType,
  ScaleTypeAesthetic,
  SequentialColorScaleOptions,
  TemporalColorScaleOptions,
  TransformedColorScaleOptions,
  TransformedPositionScaleOptions,
  TemporalDecision,
  TemporalDisambiguation,
  TemporalInterval,
  TemporalIntervalSpec,
  TemporalIntervalUnit,
  TemporalKind,
  TemporalParserName,
  TemporalParserSpec,
  TemporalPrecision,
  TemporalScaleOptions,
  TemporalWeekStart,
  DiscretePositionScaleOptions,
  RenderBackend,
  RuntimeSpec,
  ScaleCapability,
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
export {
  LINETYPE_NAMES,
  POINT_SHAPE_NAMES,
  STYLE_AESTHETIC_GEOMS,
  THEME_NAMES,
  scaleAlpha,
  scaleAlphaBinned,
  scaleAlphaContinuous,
  scaleAlphaDate,
  scaleAlphaDatetime,
  scaleAlphaDiscrete,
  scaleAlphaIdentity,
  scaleAlphaManual,
  scaleLinewidth,
  scaleLinewidthBinned,
  scaleLinewidthContinuous,
  scaleLinewidthDate,
  scaleLinewidthDatetime,
  scaleLinewidthDiscrete,
  scaleLinewidthIdentity,
  scaleLinewidthManual,
  scaleLinetype,
  scaleLinetypeBinned,
  scaleLinetypeDiscrete,
  scaleLinetypeIdentity,
  scaleLinetypeManual,
  scaleShape,
  scaleShapeBinned,
  scaleShapeDiscrete,
  scaleShapeIdentity,
  scaleShapeManual,
  scaleSize,
  scaleSizeBinned,
  scaleSizeContinuous,
  scaleSizeDate,
  scaleSizeDatetime,
  scaleSizeDiscrete,
  scaleSizeIdentity,
  scaleSizeManual,
  scale_alpha_binned,
  scale_alpha_continuous,
  scale_alpha_date,
  scale_alpha_datetime,
  scale_alpha_discrete,
  scale_alpha_identity,
  scale_alpha_manual,
  scale_linetype,
  scale_linetype_binned,
  scale_linetype_discrete,
  scale_linetype_identity,
  scale_linetype_manual,
  scale_linewidth_binned,
  scale_linewidth_continuous,
  scale_linewidth_date,
  scale_linewidth_datetime,
  scale_linewidth_discrete,
  scale_linewidth_identity,
  scale_linewidth_manual,
  scale_shape,
  scale_shape_binned,
  scale_shape_discrete,
  scale_shape_identity,
  scale_shape_manual,
  scale_size_binned,
  scale_size_continuous,
  scale_size_date,
  scale_size_datetime,
  scale_size_discrete,
  scale_size_identity,
  scale_size_manual,
} from "@ggsvelte/spec";
export type {
  AlphaScaleSpec,
  BinnedFiniteStyleScaleOptions,
  DiscreteFiniteStyleScaleOptions,
  DiscreteNumericStyleScaleOptions,
  FiniteStyleScaleOptions,
  IdentityFiniteStyleScaleOptions,
  IdentityNumericStyleScaleOptions,
  LinetypeScaleSpec,
  LinetypeName,
  PointShapeName,
  ManualFiniteStyleScaleOptions,
  ManualNumericStyleScaleOptions,
  NumericStyleScaleOptions,
  PositiveStyleScaleSpec,
  SequentialStyleScaleOptions,
  ShapeScaleSpec,
  StyleAesthetic,
  TemporalNumericStyleScaleOptions,
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
  AxisGuidePlan,
  AxisGuideTick,
  ColorbarGuidePlan,
  ColorbarGuideTick,
  ColorstepsGuidePlan,
  ColorstepsGuideStep,
  DiscreteGuideEntry,
  DiscreteGuidePlan,
  GuidePlan,
  LayerBackend,
  MappedField,
  PipelineWarning,
  RenderModel,
  RenderSVGOptions,
  ResolvedColorScale,
  ResolvedStyleScale,
  PointShape,
  Linetype,
  RunOptions,
  ScaleDecision,
  ScaleDiagnostic,
  ScaleDiagnosticFix,
  ScaleState,
  Scene,
  Stratum,
  ThemeTokens,
} from "@ggsvelte/core";
