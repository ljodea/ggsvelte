/**
 * Builder-level SpecInput surface — bare-string channel shorthand and layer
 * option forms accepted by normalize() / gg(). Canonical PortableSpec types
 * live in schema.ts; this module is the convenience superset only.
 */
import type {
  A11yMode,
  AreaParams,
  BarParams,
  BoxplotParams,
  ChannelValue,
  ColParams,
  CoordSpec,
  DataRef,
  DensityParams,
  Density2dParams,
  DotplotParams,
  ErrorbarParams,
  LinerangeParams,
  PointrangeParams,
  CrossbarParams,
  RibbonParams,
  FacetScales,
  GuidesSpec,
  InlineData,
  Labs,
  LegendSpec,
  LineParams,
  PathParams,
  PointParams,
  PointPosition,
  PositionParams,
  RasterParams,
  HexParams,
  RectParams,
  RenderBackend,
  RuleParams,
  HlineParams,
  VlineParams,
  RugParams,
  SegmentParams,
  PolygonParams,
  AblineParams,
  CurveParams,
  MapParams,
  BlankParams,
  SfParams,
  SfTextParams,
  SfLabelParams,
  SpokeParams,
  StepParams,
  QqParams,
  QqLineParams,
  Scales,
  QuantileParams,
  ContourParams,
  SmoothParams,
  StackablePosition,
  TextParams,
  ThemeName,
  ThemeSpec,
  TileParams,
  Bin2dParams,
} from "./schema.js";

/** Channel form accepted at the TS/builder level: bare string = { field }. */
export type ChannelInput = string | ChannelValue;

/** Aes accepted at the TS/builder level (bare-string shorthand allowed). */
export interface AesInput {
  x?: ChannelInput;
  y?: ChannelInput;
  color?: ChannelInput;
  fill?: ChannelInput;
  size?: ChannelInput;
  linewidth?: ChannelInput;
  alpha?: ChannelInput;
  shape?: ChannelInput;
  linetype?: ChannelInput;
  group?: ChannelInput;
  label?: ChannelInput;
  weight?: ChannelInput;
  sample?: ChannelInput;
  ymin?: ChannelInput;
  ymax?: ChannelInput;
  xmin?: ChannelInput;
  xmax?: ChannelInput;
  xend?: ChannelInput;
  yend?: ChannelInput;
  width?: ChannelInput;
  height?: ChannelInput;
  z?: ChannelInput;
  map_id?: ChannelInput;
  angle?: ChannelInput;
  radius?: ChannelInput;
}

interface LayerInputBase {
  aes?: AesInput;
  /**
   * Optional layer-local data. When omitted, the layer inherits plot-level
   * `data`. Accepts the same DataRef forms as plot-level data.
   */
  data?: DataRef;
  /** Rendering backend hint ("auto" is the default and canonicalizes away). */
  render?: RenderBackend;
}

/** Facet field accepted at the TS/builder level (bare-string field shorthand). */
export type FacetFieldInput =
  | string
  | {
      field: string;
      /** Closed explicit panel order (DomainValue[]). */
      levels?: readonly (string | number | boolean | null)[];
      /** Display-label map keyed by string form of semantic values. */
      labels?: Readonly<Record<string, string>>;
    };

/** Facet accepted at the TS/builder level (bare-string field shorthand). */
export interface FacetInput {
  wrap?: FacetFieldInput;
  rows?: FacetFieldInput;
  cols?: FacetFieldInput;
  ncol?: number;
  scales?: FacetScales;
  /** Strip chrome: position (top/bottom/left/right) and visibility. */
  strip?: {
    position?: "top" | "bottom" | "left" | "right";
    show?: boolean;
  };
}

export interface PointLayerInput extends LayerInputBase {
  geom: "point";
  stat?: "identity" | "unique" | "summary_bin" | "manual";
  position?: PointPosition;
  positionParams?: PositionParams;
  params?: PointParams;
}

export interface LineLayerInput extends LayerInputBase {
  geom: "line";
  /** identity | unique | bin | align | connect | summary_bin | manual | ecdf */
  stat?: "identity" | "unique" | "bin" | "align" | "connect" | "summary_bin" | "manual" | "ecdf";
  position?: "identity";
  params?: LineParams;
}

export interface PathLayerInput extends LayerInputBase {
  geom: "path";
  /** identity | unique | connect | manual (#814) | ellipse (#812) */
  stat?: "identity" | "unique" | "connect" | "manual" | "ellipse";
  position?: "identity";
  params?: PathParams;
}

export interface ColLayerInput extends LayerInputBase {
  geom: "col";
  stat?: "identity" | "unique";
  position?: StackablePosition;
  params?: ColParams;
}

export interface BarLayerInput extends LayerInputBase {
  geom: "bar";
  stat?: "count" | "bin";
  position?: StackablePosition;
  params?: BarParams;
}

export interface HistogramLayerInput extends LayerInputBase {
  geom: "histogram";
  stat?: "bin";
  position?: StackablePosition;
  params?: BarParams;
}
export interface FreqpolyLayerInput extends LayerInputBase {
  geom: "freqpoly";
  stat?: "bin";
  position?: "identity";
  params?: LineParams;
}

export interface AreaLayerInput extends LayerInputBase {
  geom: "area";
  stat?: "identity" | "unique" | "align";
  position?: StackablePosition;
  params?: AreaParams;
}

export interface RuleLayerInput extends LayerInputBase {
  geom: "rule";
  stat?: "identity" | "unique";
  position?: "identity";
  params?: RuleParams;
}

export interface HlineLayerInput extends LayerInputBase {
  geom: "hline";
  stat?: "identity";
  position?: "identity";
  params?: HlineParams;
}

export interface VlineLayerInput extends LayerInputBase {
  geom: "vline";
  stat?: "identity";
  position?: "identity";
  params?: VlineParams;
}

export interface JitterLayerInput extends LayerInputBase {
  geom: "jitter";
  stat?: "identity";
  position?: "jitter";
  positionParams?: PositionParams;
  params?: PointParams;
}

export interface TextLayerInput extends LayerInputBase {
  geom: "text";
  stat?: "identity" | "unique";
  position?: "identity" | "nudge";
  positionParams?: PositionParams;
  params?: TextParams;
}

export interface SmoothLayerInput extends LayerInputBase {
  geom: "smooth";
  stat?: "smooth";
  position?: "identity";
  params?: SmoothParams;
}

export interface QuantileLayerInput extends LayerInputBase {
  geom: "quantile";
  stat?: "quantile";
  position?: "identity";
  params?: QuantileParams;
}

export interface ContourLayerInput extends LayerInputBase {
  geom: "contour";
  stat?: "contour";
  position?: "identity";
  params?: ContourParams;
}

export interface BoxplotLayerInput extends LayerInputBase {
  geom: "boxplot";
  stat?: "boxplot";
  position?: "dodge" | "identity";
  params?: BoxplotParams;
}

export interface DensityLayerInput extends LayerInputBase {
  geom: "density";
  stat?: "density";
  position?: "identity";
  params?: DensityParams;
}

export interface Density2dLayerInput extends LayerInputBase {
  geom: "density_2d";
  stat?: "density_2d";
  position?: "identity";
  params?: Density2dParams;
}

export interface Density2dFilledLayerInput extends LayerInputBase {
  geom: "density_2d_filled";
  stat?: "density_2d_filled";
  position?: "identity";
  params?: Density2dParams;
}

export interface DotplotLayerInput extends LayerInputBase {
  geom: "dotplot";
  stat?: "bindot";
  position?: "identity";
  params?: DotplotParams;
}

export interface ErrorbarLayerInput extends LayerInputBase {
  geom: "errorbar";
  stat?: "identity" | "unique" | "summary" | "summary_bin";
  position?: "identity";
  params?: ErrorbarParams;
}

export interface LinerangeLayerInput extends LayerInputBase {
  geom: "linerange";
  stat?: "identity" | "summary";
  position?: "identity";
  params?: LinerangeParams;
}

export interface PointrangeLayerInput extends LayerInputBase {
  geom: "pointrange";
  stat?: "identity" | "summary";
  position?: "identity";
  params?: PointrangeParams;
}

export interface CrossbarLayerInput extends LayerInputBase {
  geom: "crossbar";
  stat?: "identity" | "summary";
  position?: "identity";
  params?: CrossbarParams;
}

export interface RectLayerInput extends LayerInputBase {
  geom: "rect";
  stat?: "identity" | "unique";
  position?: "identity";
  params?: RectParams;
}

export interface TileLayerInput extends LayerInputBase {
  geom: "tile";
  stat?: "identity";
  position?: "identity";
  params?: TileParams;
}

export interface Bin2dLayerInput extends LayerInputBase {
  geom: "bin_2d";
  stat?: "bin_2d";
  position?: "identity";
  params?: Bin2dParams;
}

export interface RasterLayerInput extends LayerInputBase {
  geom: "raster";
  stat?: "identity";
  position?: "identity";
  params?: RasterParams;
}

export interface HexLayerInput extends LayerInputBase {
  geom: "hex";
  stat?: "bin_hex";
  position?: "identity";
  params?: HexParams;
}

export interface RibbonLayerInput extends LayerInputBase {
  geom: "ribbon";
  stat?: "identity" | "unique";
  position?: "identity";
  params?: RibbonParams;
}

export interface SegmentLayerInput extends LayerInputBase {
  geom: "segment";
  stat?: "identity" | "unique";
  position?: "identity";
  params?: SegmentParams;
}

export interface PolygonLayerInput extends LayerInputBase {
  geom: "polygon";
  stat?: "identity";
  position?: "identity";
  params?: PolygonParams;
}

export interface QqLayerInput extends LayerInputBase {
  geom: "qq";
  stat?: "qq";
  position?: "identity";
  params?: QqParams;
}

export interface QqLineLayerInput extends LayerInputBase {
  geom: "qq_line";
  stat?: "qq_line";
  position?: "identity";
  params?: QqLineParams;
}

export interface AblineLayerInput extends LayerInputBase {
  geom: "abline";
  stat?: "identity";
  position?: "identity";
  params?: AblineParams;
}

export interface CurveLayerInput extends LayerInputBase {
  geom: "curve";
  stat?: "identity";
  position?: "identity";
  params?: CurveParams;
}

export interface MapLayerInput extends LayerInputBase {
  geom: "map";
  stat?: "identity";
  position?: "identity";
  params: MapParams;
}

export interface SfLayerInput extends LayerInputBase {
  geom: "sf";
  /** Geometry expand (ggplot2 `stat_sf`); default from GEOM_DEFAULTS. */
  stat?: "sf";
  position?: "identity";
  params?: SfParams;
}

export interface SfTextLayerInput extends LayerInputBase {
  geom: "sf_text";
  stat?: "sf_coordinates";
  position?: "identity";
  params?: SfTextParams;
}

export interface SfLabelLayerInput extends LayerInputBase {
  geom: "sf_label";
  stat?: "sf_coordinates";
  position?: "identity";
  params?: SfLabelParams;
}

export interface BlankLayerInput extends LayerInputBase {
  geom: "blank";
  stat?: "identity";
  position?: "identity";
  params?: BlankParams;
}

export interface SpokeLayerInput extends LayerInputBase {
  geom: "spoke";
  stat?: "identity";
  position?: "identity";
  params?: SpokeParams;
}

export interface RugLayerInput extends LayerInputBase {
  geom: "rug";
  stat?: "identity";
  position?: "identity";
  params?: RugParams;
}

export interface StepLayerInput extends LayerInputBase {
  geom: "step";
  stat?: "identity";
  position?: "identity";
  params?: StepParams;
}

/** Layer accepted at the TS/builder level. */
export type LayerInput =
  | PointLayerInput
  | LineLayerInput
  | PathLayerInput
  | ColLayerInput
  | BarLayerInput
  | HistogramLayerInput
  | FreqpolyLayerInput
  | AreaLayerInput
  | RibbonLayerInput
  | RuleLayerInput
  | HlineLayerInput
  | VlineLayerInput
  | JitterLayerInput
  | TextLayerInput
  | SmoothLayerInput
  | QuantileLayerInput
  | ContourLayerInput
  | BoxplotLayerInput
  | DensityLayerInput
  | Density2dLayerInput
  | Density2dFilledLayerInput
  | DotplotLayerInput
  | ErrorbarLayerInput
  | LinerangeLayerInput
  | PointrangeLayerInput
  | CrossbarLayerInput
  | AblineLayerInput
  | RectLayerInput
  | TileLayerInput
  | Bin2dLayerInput
  | RasterLayerInput
  | HexLayerInput
  | SegmentLayerInput
  | PolygonLayerInput
  | CurveLayerInput
  | MapLayerInput
  | SfLayerInput
  | SfTextLayerInput
  | SfLabelLayerInput
  | BlankLayerInput
  | SpokeLayerInput
  | RugLayerInput
  | StepLayerInput
  | QqLayerInput
  | QqLineLayerInput;

/** Spec accepted at the TS/builder level (superset of PortableSpec forms). */
export interface SpecInput {
  $schema?: string;
  /** Defaults edition (Hadley lesson 13). Absent = current; normalize stamps it. */
  edition?: number;
  data?: DataRef;
  datasets?: Record<string, InlineData>;
  aes?: AesInput;
  layers: LayerInput[];
  facet?: FacetInput;
  coord?: CoordSpec;
  scales?: Scales;
  guides?: GuidesSpec;
  legend?: LegendSpec;
  labs?: Labs;
  theme?: ThemeName | ThemeSpec;
  width?: number;
  height?: number;
  a11y?: A11yMode;
}
