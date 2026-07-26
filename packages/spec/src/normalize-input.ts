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
  RectParams,
  RenderBackend,
  RuleParams,
  SegmentParams,
  CurveParams,
  Scales,
  QuantileParams,
  ContourParams,
  SmoothParams,
  StackablePosition,
  TextParams,
  ThemeName,
  ThemeSpec,
  TileParams,
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
  ymin?: ChannelInput;
  ymax?: ChannelInput;
  xmin?: ChannelInput;
  xmax?: ChannelInput;
  xend?: ChannelInput;
  yend?: ChannelInput;
  width?: ChannelInput;
  height?: ChannelInput;
  z?: ChannelInput;
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
  /** identity | unique | bin | align | connect | summary_bin | manual */
  stat?: "identity" | "unique" | "bin" | "align" | "connect" | "summary_bin" | "manual";
  position?: "identity";
  params?: LineParams;
}

export interface PathLayerInput extends LayerInputBase {
  geom: "path";
  /** identity | unique | connect | manual (#814) */
  stat?: "identity" | "unique" | "connect" | "manual";
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

export interface RasterLayerInput extends LayerInputBase {
  geom: "raster";
  stat?: "identity";
  position?: "identity";
  params?: RasterParams;
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

export interface CurveLayerInput extends LayerInputBase {
  geom: "curve";
  stat?: "identity";
  position?: "identity";
  params?: CurveParams;
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
  | RectLayerInput
  | TileLayerInput
  | RasterLayerInput
  | SegmentLayerInput
  | CurveLayerInput;

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
