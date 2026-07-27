/**
 * The ggsvelte spec schema — TypeBox is the source of truth (decision 0004).
 *
 * These definitions ARE the published JSON Schema (via `Type.Cyclic` for named
 * `$defs`, emitted to `schema/v0.json` by `scripts/emit-schema.ts`) AND the TS
 * types (via `Static<>`) AND the runtime validator input (`Value.Check`).
 * One artifact, no drift.
 *
 * Authoring rules (from decision 0004):
 * - Strict objects everywhere (`additionalProperties: false`).
 * - Every field carries a description written for LLMs; numeric constraints
 *   are ALSO stated in descriptions because constrained-decoding grammars may
 *   drop or reject numeric keywords.
 * - No bare-string channel shorthand in the schema: agents emit canonical
 *   channel forms only. The shorthand exists only in the TS builder/adapter.
 * - Unions are `anyOf` by construction (TypeBox default) — the form OpenAI
 *   structured outputs accept.
 * - `Type.Record` is used for `data.columns`/`datasets` only; the artifact
 *   emitter rewrites its `patternProperties` to `additionalProperties`
 *   (semantically identical for the `^(.*)$` pattern) so the published
 *   schema stays inside portable JSON Schema.
 *
 * Layout: name registries (`schema-names.ts`), ordered `$defs` bag
 * (`schema-declarations.ts`), pipeline catalogs (`schema-catalog.ts`), and
 * this facade (Cyclic/Module assembly + public Static types + re-exports).
 * `$defs` key **insertion order** in the declarations bag is load-bearing for
 * the byte-stable `schema/v0.json` artifact.
 */
import Type, { type Static, type TSchema } from "typebox";

import { SpecDeclarations } from "./schema-declarations.js";

export {
  CATEGORICAL_SCHEME_NAMES,
  COLOR_SCHEME_NAMES,
  LINETYPE_NAMES,
  MAX_BINNED_BREAKS,
  MAX_GLOW_RADIUS,
  MAX_PAINT_STOPS,
  POINT_SHAPE_NAMES,
  SEQUENTIAL_SCHEME_NAMES,
  THEME_NAMES,
  THEME_NAME_ALIASES,
} from "./schema-names.js";
export type { LinetypeName, PointShapeName } from "./schema-names.js";

export {
  CHANNELS,
  CURRENT_EDITION,
  GEOM_DEFAULTS,
  KNOWN_GEOMS,
  KNOWN_POSITIONS,
  KNOWN_STATS,
} from "./schema-catalog.js";
export type { ChannelName, GeomName, PositionName, StatName } from "./schema-catalog.js";

/**
 * Named-defs module surface (public).
 * `.Import(key)` returns a Cyclic schema rooted at `key` (`$defs` + `$ref`),
 * matching the TypeBox 0.x Module.Import JSON shape used by the artifact
 * emitter and by Value.Check / Value.Errors.
 *
 * Type inference uses `Static<>` on `SpecDeclarations` (not Cyclic Import):
 * Cyclic's Static<> collapses large graphs to `never` under TypeScript 6.
 * We avoid `Type.Module(SpecDeclarations)` for Static extraction — the Module
 * surface hits TS7056 on composite .d.ts emit once geom unions grow large.
 *
 * Build the `$defs` graph once (rooted at PlotSpec) and re-root by swapping
 * `$ref` — Type.Cyclic(decls, key) per import would rebuild the full graph
 * ~20× at module load.
 */
const SpecDefsRoot = Type.Cyclic(SpecDeclarations, "PlotSpec");

/** Cyclic schema: shared `$defs` bag + root `$ref` (TypeBox 0.x Import shape). */
export type SpecImportSchema = {
  $defs: (typeof SpecDefsRoot)["$defs"];
  $ref: string;
} & TSchema;

function reRootSpec(key: keyof typeof SpecDeclarations): SpecImportSchema {
  // One shared `$defs` graph; only the root `$ref` changes per import.
  const schema: SpecImportSchema = {
    $defs: SpecDefsRoot.$defs,
    $ref: key,
  };
  return schema;
}

export const SpecModule = {
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- preserves TypeBox 0.x instantiation-expression compatibility
  Import<Key extends keyof typeof SpecDeclarations>(key: Key): SpecImportSchema {
    return reRootSpec(key);
  },
};

/**
 * Spec type bag for Static<> extraction (not for JSON emission).
 *
 * Prefer `ReturnType<typeof Type.Module<...>>` over a `const SpecStatic =
 * Type.Module(...)` value: once LayerSpec includes density_2d_filled + map the
 * Module instance exceeds TS7056 declaration-serialize limits under composite
 * emit. The type-level Module is enough for SpecType / Static<>.
 */
type SpecModuleStatic = ReturnType<typeof Type.Module<typeof SpecDeclarations>>;
type SpecType<K extends keyof SpecModuleStatic> = Static<SpecModuleStatic[K]>;

// ---------------------------------------------------------------------------
// Imported (validatable) schemas — Cyclic `$defs`+`$ref` for runtime/artifact
// ---------------------------------------------------------------------------

export const PlotSpecSchema = SpecModule.Import("PlotSpec");
export const LayerSpecSchema = SpecModule.Import("LayerSpec");
export const PointLayerSchema = SpecModule.Import("PointLayer");
export const LineLayerSchema = SpecModule.Import("LineLayer");
export const PathLayerSchema = SpecModule.Import("PathLayer");
export const ColLayerSchema = SpecModule.Import("ColLayer");
export const BarLayerSchema = SpecModule.Import("BarLayer");
export const HistogramLayerSchema = SpecModule.Import("HistogramLayer");
export const FreqpolyLayerSchema = SpecModule.Import("FreqpolyLayer");
export const AreaLayerSchema = SpecModule.Import("AreaLayer");
export const RibbonLayerSchema = SpecModule.Import("RibbonLayer");
export const SegmentLayerSchema = SpecModule.Import("SegmentLayer");
export const FunctionLayerSchema = SpecModule.Import("FunctionLayer");
export const PolygonLayerSchema = SpecModule.Import("PolygonLayer");
export const AblineLayerSchema = SpecModule.Import("AblineLayer");
export const CurveLayerSchema = SpecModule.Import("CurveLayer");
export const MapLayerSchema = SpecModule.Import("MapLayer");
export const BlankLayerSchema = SpecModule.Import("BlankLayer");
export const SfLayerSchema = SpecModule.Import("SfLayer");
export const SfTextLayerSchema = SpecModule.Import("SfTextLayer");
export const SfLabelLayerSchema = SpecModule.Import("SfLabelLayer");

export const SpokeLayerSchema = SpecModule.Import("SpokeLayer");
export const RugLayerSchema = SpecModule.Import("RugLayer");
export const StepLayerSchema = SpecModule.Import("StepLayer");
export const QqLayerSchema = SpecModule.Import("QqLayer");
export const QqLineLayerSchema = SpecModule.Import("QqLineLayer");
export const RuleLayerSchema = SpecModule.Import("RuleLayer");
export const HlineLayerSchema = SpecModule.Import("HlineLayer");
export const VlineLayerSchema = SpecModule.Import("VlineLayer");
export const JitterLayerSchema = SpecModule.Import("JitterLayer");
export const TextLayerSchema = SpecModule.Import("TextLayer");
export const SmoothLayerSchema = SpecModule.Import("SmoothLayer");
export const QuantileLayerSchema = SpecModule.Import("QuantileLayer");
export const ContourLayerSchema = SpecModule.Import("ContourLayer");
export const BoxplotLayerSchema = SpecModule.Import("BoxplotLayer");
export const DensityLayerSchema = SpecModule.Import("DensityLayer");
export const Density2dLayerSchema = SpecModule.Import("Density2dLayer");
export const Density2dFilledLayerSchema = SpecModule.Import("Density2dFilledLayer");
export const DotplotLayerSchema = SpecModule.Import("DotplotLayer");
export const ErrorbarLayerSchema = SpecModule.Import("ErrorbarLayer");
export const LinerangeLayerSchema = SpecModule.Import("LinerangeLayer");
export const PointrangeLayerSchema = SpecModule.Import("PointrangeLayer");
export const CrossbarLayerSchema = SpecModule.Import("CrossbarLayer");
export const RectLayerSchema = SpecModule.Import("RectLayer");
export const TileLayerSchema = SpecModule.Import("TileLayer");
export const Bin2dLayerSchema = SpecModule.Import("Bin2dLayer");
export const RasterLayerSchema = SpecModule.Import("RasterLayer");
export const HexLayerSchema = SpecModule.Import("HexLayer");
export const AesSchema = SpecModule.Import("Aes");
export const ChannelValueSchema = SpecModule.Import("ChannelValue");
export const DataRefSchema = SpecModule.Import("DataRef");
export const ScalesSchema = SpecModule.Import("Scales");
export const TemporalParserSpecSchemaRef = SpecModule.Import("TemporalParserSpec");
export const FacetFieldRefSchema = SpecModule.Import("FacetFieldRef");
export const FacetStripSpecSchema = SpecModule.Import("FacetStripSpec");
export const FacetSpecSchema = SpecModule.Import("FacetSpec");
export const CoordTransformAxisSpecSchema = SpecModule.Import("CoordTransformAxisSpec");
export const CoordTransformSpecSchema = SpecModule.Import("CoordTransformSpec");
export const CoordFixedSpecSchema = SpecModule.Import("CoordFixedSpec");
export const CoordSfSpecSchema = SpecModule.Import("CoordSfSpec");
export const CoordSpecSchema = SpecModule.Import("CoordSpec");

// ---------------------------------------------------------------------------
// Static types (the package's public TS types)
// ---------------------------------------------------------------------------

/** A single data cell (JSON scalar). */
export type CellValue = SpecType<"CellValue">;

// The data-container types are written out by hand: TypeBox's computed module
// types collapse `Type.Record`/`additionalProperties` value schemas to `{}`
// in Static<>, losing the record value type. Runtime validation and the
// emitted JSON Schema are unaffected (they come from the module above); these
// aliases restore the intended TS shapes and are covered by assignability
// tests against schema fixtures.

/** Inline row-oriented data. */
export interface DataValues {
  values: Record<string, CellValue>[];
}
/** Inline column-oriented data (equal-length arrays). */
export interface DataColumns {
  columns: Record<string, CellValue[]>;
}
/** A reference to a named dataset. */
export interface DataName {
  name: string;
}
/** Where a plot's data comes from. */
export type DataRef = DataValues | DataColumns | DataName;
/** Inline data only ({values} or {columns}). */
export type InlineData = DataValues | DataColumns;
/** Canonical channel value: {field} | {value, scale?} | {stat} | null. */
export type ChannelValue = SpecType<"ChannelValue">;
/** Aesthetic mapping (canonical channel forms only). */
export type Aes = SpecType<"Aes">;
/** One ordered gradient color stop. */
export type ColorStop = SpecType<"ColorStop">;
/** Gradient coordinate space. */
export type PaintSpace = SpecType<"PaintSpace">;
/** Deterministic linear gradient paint. */
export type LinearGradientPaint = SpecType<"LinearGradientPaint">;
/** Deterministic radial gradient paint. */
export type RadialGradientPaint = SpecType<"RadialGradientPaint">;
/** Closed portable gradient paint (linear | radial). */
export type GradientPaint = SpecType<"GradientPaint">;
/** Bounded glow treatment. */
export type GlowSpec = SpecType<"GlowSpec">;
/** Point layer params. */
export type PointParams = SpecType<"PointParams">;
/** Line layer params. */
export type LineParams = SpecType<"LineParams">;
/** Path layer params (no bin knobs). */
export type PathParams = SpecType<"PathParams">;
/** Step layer params (ggplot2 geom_step direction). */
export type StepParams = SpecType<"StepParams">;
/** Col layer params. */
export type ColParams = SpecType<"ColParams">;
/** Bar/histogram layer params (styling + stat-bin controls). */
export type BarParams = SpecType<"BarParams">;
/** Area layer params. */
export type AreaParams = SpecType<"AreaParams">;
/** Rule layer params (annotation intercepts + styling). */
export type RuleParams = SpecType<"RuleParams">;
/** Hline alias params (yintercept + styling). */
export type HlineParams = SpecType<"HlineParams">;
/** Vline alias params (xintercept + styling). */
export type VlineParams = SpecType<"VlineParams">;
/** Segment layer params (styling + lineend). */
export type SegmentParams = SpecType<"SegmentParams">;
/** Function layer params (named fun + grid). */
export type FunctionParams = SpecType<"FunctionParams">;
/** Named portable function registry entry. */
export type FunctionRegistryName = SpecType<"FunctionRegistryName">;
/** Args bag for registry functions. */
export type FunctionArgs = SpecType<"FunctionArgs">;
/** Polygon layer params (fill/stroke styling). */
export type PolygonParams = SpecType<"PolygonParams">;
export type AblineParams = SpecType<"AblineParams">;
/** Curve layer params (curvature/angle/ncp + stroke). */
export type CurveParams = SpecType<"CurveParams">;
/** Simple-features layer params (geometry column + styling; #809 phase 1). */
export type SfParams = SpecType<"SfParams">;
/** Map layer params (fortified map DataRef + styling; #808). */
export type MapParams = SpecType<"MapParams">;
/** SF text layer params (geometry column + text styling; #809 phase 2). */
export type SfTextParams = SpecType<"SfTextParams">;
/** SF label layer params (geometry + text + box chrome; #809 phase 3). */
export type SfLabelParams = SpecType<"SfLabelParams">;
/** Rug layer params (sides, length, stroke styling). */
export type RugParams = SpecType<"RugParams">;
export type QqParams = SpecType<"QqParams">;
export type QqLineParams = SpecType<"QqLineParams">;
/** Text layer params. */
export type TextParams = SpecType<"TextParams">;
/** Smooth layer params (method/se/level/span/degree/n + styling). */
export type SmoothParams = SpecType<"SmoothParams">;
/** Quantile layer params (quantiles/n + styling). */
export type QuantileParams = SpecType<"QuantileParams">;
/** Contour isoline params (bins/breaks/binwidth + stroke; #801). */
export type ContourParams = SpecType<"ContourParams">;
/** Boxplot layer params. */
export type BoxplotParams = SpecType<"BoxplotParams">;
/** Density layer params (bw/adjust/n/cut + styling). */
export type DensityParams = SpecType<"DensityParams">;
/** 2D density isoline params (#802). */
export type Density2dParams = SpecType<"Density2dParams">;
/** Dotplot layer params (histodot binning + stack + point style; #803). */
export type DotplotParams = SpecType<"DotplotParams">;
/** A summary function name (stat summary). */
export type SummaryFun = SpecType<"SummaryFun">;
/** Errorbar layer params (styling + summary-stat functions). */
export type ErrorbarParams = SpecType<"ErrorbarParams">;
/** Linerange params (alias of ErrorbarParams). */
export type LinerangeParams = SpecType<"LinerangeParams">;
/** Pointrange params (stem + mid point size/shape). */
export type PointrangeParams = SpecType<"PointrangeParams">;
/** Crossbar params (width, fatten, stroke). */
export type CrossbarParams = SpecType<"CrossbarParams">;
/** Rect layer params. */
export type RectParams = SpecType<"RectParams">;
/** Tile layer params. */
export type TileParams = SpecType<"TileParams">;
/** bin_2d layer params. */
export type Bin2dParams = SpecType<"Bin2dParams">;
/** Raster layer params. */
export type RasterParams = SpecType<"RasterParams">;
/** Hex bin heatmap params. */
export type HexParams = SpecType<"HexParams">;
/** Ribbon layer params (outline, orientation, stroke ends). */
export type RibbonParams = SpecType<"RibbonParams">;
/** Jitter/nudge position parameters. */
export type PositionParams = SpecType<"PositionParams">;
// Layer types: TypeBox Static collapses DataRef to object[]; restore the
// hand-written DataRef on optional per-layer `data` (#589).
type LayerWithDataRef<T> = Omit<T, "data"> & { data?: DataRef };
/** A point layer. */
export type PointLayer = LayerWithDataRef<SpecType<"PointLayer">>;
/** A line layer. */
export type LineLayer = LayerWithDataRef<SpecType<"LineLayer">>;
/** A path layer (data-order polylines; ggplot2 geom_path). */
export type PathLayer = LayerWithDataRef<SpecType<"PathLayer">>;
/** A col layer (pre-computed bars). */
export type ColLayer = LayerWithDataRef<SpecType<"ColLayer">>;
/** A bar layer (count or bin stat). */
export type BarLayer = LayerWithDataRef<SpecType<"BarLayer">>;
/** A histogram layer (alias; normalize() canonicalizes to bar + stat bin). */
export type HistogramLayer = LayerWithDataRef<SpecType<"HistogramLayer">>;
/** A freqpoly layer (alias; normalize() → line + stat bin). */
export type FreqpolyLayer = LayerWithDataRef<SpecType<"FreqpolyLayer">>;
/** An area layer. */
export type AreaLayer = LayerWithDataRef<SpecType<"AreaLayer">>;
/** A rule (reference line) layer. */
export type RuleLayer = LayerWithDataRef<SpecType<"RuleLayer">>;
/** An hline layer (alias; normalize() → rule). */
export type HlineLayer = LayerWithDataRef<SpecType<"HlineLayer">>;
/** A vline layer (alias; normalize() → rule). */
export type VlineLayer = LayerWithDataRef<SpecType<"VlineLayer">>;
/** A jitter layer (alias; normalize() → point + position jitter). */
export type JitterLayer = LayerWithDataRef<SpecType<"JitterLayer">>;
/** A text-label layer. */
export type TextLayer = LayerWithDataRef<SpecType<"TextLayer">>;
/** A smooth (fitted trend) layer. */
export type SmoothLayer = LayerWithDataRef<SpecType<"SmoothLayer">>;
/** A quantile regression layer. */
export type QuantileLayer = LayerWithDataRef<SpecType<"QuantileLayer">>;
/** A contour isoline layer (#801). */
export type ContourLayer = LayerWithDataRef<SpecType<"ContourLayer">>;
/** A boxplot layer. */
export type BoxplotLayer = LayerWithDataRef<SpecType<"BoxplotLayer">>;
/** A density (KDE) layer. */
export type DensityLayer = LayerWithDataRef<SpecType<"DensityLayer">>;
/** A 2D density isoline layer (#802). */
export type Density2dLayer = LayerWithDataRef<SpecType<"Density2dLayer">>;
/** A filled 2D density layer. */
export type Density2dFilledLayer = LayerWithDataRef<SpecType<"Density2dFilledLayer">>;
/** A stacked-dot (geom_dotplot) layer. */
export type DotplotLayer = LayerWithDataRef<SpecType<"DotplotLayer">>;
/** An errorbar layer. */
export type ErrorbarLayer = LayerWithDataRef<SpecType<"ErrorbarLayer">>;
/** A linerange layer (stem without caps). */
export type LinerangeLayer = LayerWithDataRef<SpecType<"LinerangeLayer">>;
/** A pointrange layer (stem + mid point). */
export type PointrangeLayer = LayerWithDataRef<SpecType<"PointrangeLayer">>;
/** A crossbar layer (interval box + mid line). */
export type CrossbarLayer = LayerWithDataRef<SpecType<"CrossbarLayer">>;
/** A rect layer (arbitrary xmin/xmax/ymin/ymax regions). */
export type RectLayer = LayerWithDataRef<SpecType<"RectLayer">>;
/** A tile layer (center-sized cells). */
export type TileLayer = LayerWithDataRef<SpecType<"TileLayer">>;
/** A 2D bin heatmap layer. */
export type Bin2dLayer = LayerWithDataRef<SpecType<"Bin2dLayer">>;
/** A raster layer (equal-cell dense grid). */
export type RasterLayer = LayerWithDataRef<SpecType<"RasterLayer">>;
/** A hexagonal bin heatmap layer. */
export type HexLayer = LayerWithDataRef<SpecType<"HexLayer">>;
/** A ribbon (interval band) layer. */
export type RibbonLayer = LayerWithDataRef<SpecType<"RibbonLayer">>;
/** A finite segment layer ((x,y)→(xend,yend)). */
export type SegmentLayer = LayerWithDataRef<SpecType<"SegmentLayer">>;
/** An analytic function path layer (y = f(x) grid). */
export type FunctionLayer = LayerWithDataRef<SpecType<"FunctionLayer">>;
/** A closed polygon layer ((x,y) vertices in data order). */
export type PolygonLayer = LayerWithDataRef<SpecType<"PolygonLayer">>;
/** A slope/intercept reference line layer (geom_abline). */
export type AblineLayer = LayerWithDataRef<SpecType<"AblineLayer">>;
/** A curve layer (curved connectors). */
export type CurveLayer = LayerWithDataRef<SpecType<"CurveLayer">>;
/** A choropleth/map layer (#808). */
export type MapLayer = LayerWithDataRef<SpecType<"MapLayer">>;
export type SfLayer = LayerWithDataRef<SpecType<"SfLayer">>;
/** An sf_text layer (labels at representative points; #809 phase 2). */
export type SfTextLayer = LayerWithDataRef<SpecType<"SfTextLayer">>;
/** An sf_label layer (boxed labels at representative points; #809 phase 3). */
export type SfLabelLayer = LayerWithDataRef<SpecType<"SfLabelLayer">>;
/**
 * Empty params bag for blank layers.
 *
 * TypeBox `Type.Object({})` Static-infers as `{}`, which is *not* assignable
 * to `Record<string, unknown>` and also poisons `LayerSpec["params"]` unions
 * (oxlint no-unnecessary-type-assertion on every `(layer.params ?? {}) as X`).
 * Override so blank matches every other geom params bag.
 */
export type BlankParams = Record<string, never>;
/** A blank layer (no marks; trains scales from mapped aesthetics). */
export type BlankLayer = LayerWithDataRef<
  Omit<SpecType<"BlankLayer">, "params"> & { readonly params?: BlankParams }
>;

export type SpokeParams = SpecType<"SpokeParams">;
export type SpokeLayer = LayerWithDataRef<SpecType<"SpokeLayer">>;
/** A marginal rug layer (edge ticks). */
export type RugLayer = LayerWithDataRef<SpecType<"RugLayer">>;
/** A step-line layer (ggplot2 geom_step). */
export type StepLayer = LayerWithDataRef<SpecType<"StepLayer">>;
export type QqLayer = LayerWithDataRef<SpecType<"QqLayer">>;
export type QqLineLayer = LayerWithDataRef<SpecType<"QqLineLayer">>;
/** One plot layer, discriminated by `geom`. */
export type LayerSpec =
  | PointLayer
  | LineLayer
  | PathLayer
  | ColLayer
  | BarLayer
  | HistogramLayer
  | FreqpolyLayer
  | AreaLayer
  | RibbonLayer
  | SegmentLayer
  | FunctionLayer
  | PolygonLayer
  | AblineLayer
  | CurveLayer
  | MapLayer
  | SfLayer
  | SfTextLayer
  | SfLabelLayer
  | BlankLayer
  | SpokeLayer
  | RugLayer
  | StepLayer
  | RuleLayer
  | HlineLayer
  | VlineLayer
  | JitterLayer
  | TextLayer
  | SmoothLayer
  | QuantileLayer
  | ContourLayer
  | BoxplotLayer
  | DensityLayer
  | Density2dLayer
  | Density2dFilledLayer
  | DotplotLayer
  | ErrorbarLayer
  | LinerangeLayer
  | PointrangeLayer
  | CrossbarLayer
  | RectLayer
  | TileLayer
  | Bin2dLayer
  | RasterLayer
  | HexLayer
  | QqLayer
  | QqLineLayer;
/** Stackable position adjustment names. */
export type StackablePosition = SpecType<"StackablePosition">;
/** Position adjustments accepted by point layers. */
export type PointPosition = "identity" | "jitter" | "nudge";
/** Positional (x/y) scale configuration. */
export type TemporalParserSpec = SpecType<"TemporalParserSpec">;
export type PositionScaleSpec = SpecType<"PositionScaleSpec">;
/** Display-domain expansion ({ mult?, add? }) for continuous/binned scales. */
export type ScaleExpansion = SpecType<"ScaleExpansion">;
/** Color/fill scale configuration. */
export type ColorScaleSpec = SpecType<"ColorScaleSpec">;
/** Positive numeric size/linewidth scale configuration. */
export type PositiveStyleScaleSpec = SpecType<"PositiveStyleScaleSpec">;
/** Opacity scale configuration. */
export type AlphaScaleSpec = SpecType<"AlphaScaleSpec">;
/** Finite point-shape scale configuration. */
export type ShapeScaleSpec = SpecType<"ShapeScaleSpec">;
/** Finite stroke-pattern scale configuration. */
export type LinetypeScaleSpec = SpecType<"LinetypeScaleSpec">;
/** Per-scale configuration for all position and style aesthetics. */
export type Scales = SpecType<"Scales">;
/** Facet-panel scale behavior. */
export type FacetScales = SpecType<"FacetScales">;
/** Facet configuration (wrap OR rows/cols grid). */
export type FacetFieldRef = SpecType<"FacetFieldRef">;
export type FacetStripSpec = SpecType<"FacetStripSpec">;
export type FacetSpec = SpecType<"FacetSpec">;
/** One post-stat coordinate axis transform. */
export type CoordTransformAxisSpec = SpecType<"CoordTransformAxisSpec">;
/** Post-stat coordinate transform configuration. */
export type CoordTransformSpec = SpecType<"CoordTransformSpec">;
/** Fixed-aspect Cartesian coordinate configuration. */
export type CoordFixedSpec = SpecType<"CoordFixedSpec">;
/** Simple-features fixed-aspect coordinates (already-projected maps; #809). */
export type CoordSfSpec = SpecType<"CoordSfSpec">;
/** Cartesian, flipped, post-stat transformed, fixed-aspect, or SF fixed-aspect. */
export type CoordSpec = SpecType<"CoordSpec">;
/** Per-layer rendering backend hint. */
export type RenderBackend = SpecType<"RenderBackend">;
/** Plot-level accessibility mode. */
export type A11yMode = "auto" | "force-svg";
/** Bounded per-guide presentation theme overrides. */
export type GuideThemeSpec = SpecType<"GuideThemeSpec">;
export type BandAxisGuideSpec = SpecType<"BandAxisGuideSpec">;
export type AxisGuideSpec = SpecType<"AxisGuideSpec">;
export type LegendGuideSpec = SpecType<"LegendGuideSpec">;
export type ColorbarGuideSpec = SpecType<"ColorbarGuideSpec">;
export type ColorstepsGuideSpec = SpecType<"ColorstepsGuideSpec">;
export type NoneGuideSpec = SpecType<"NoneGuideSpec">;
/** One portable appearance-only guide configuration. */
export type GuideSpec = SpecType<"GuideSpec">;
/** Guide configuration keyed by aesthetic. */
export type GuidesSpec = SpecType<"GuidesSpec">;
/** Legacy legend ordering options. */
export type LegendSpec = SpecType<"LegendSpec">;
/** Built-in theme names. */
export type ThemeName = SpecType<"ThemeName">;
/** Theme object: named base + role overrides. */
export type ThemeSpec = SpecType<"ThemeSpec">;
/** Plot labels. */
export type Labs = SpecType<"Labs">;
/** The canonical, strictly-JSON plot spec (what agents emit and schemas describe). */
export type PortableSpec = Omit<SpecType<"PlotSpec">, "data" | "datasets" | "layers"> & {
  data?: DataRef;
  datasets?: Record<string, InlineData>;
  layers: LayerSpec[];
};
