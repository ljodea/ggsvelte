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
  ErrorbarParams,
  RibbonParams,
  FacetScales,
  GuidesSpec,
  InlineData,
  Labs,
  LegendSpec,
  LineParams,
  PointParams,
  PointPosition,
  PositionParams,
  RasterParams,
  RectParams,
  RenderBackend,
  RuleParams,
  SegmentParams,
  Scales,
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

/** Facet accepted at the TS/builder level (bare-string field shorthand). */
export interface FacetInput {
  wrap?: string | { field: string };
  rows?: string | { field: string };
  cols?: string | { field: string };
  ncol?: number;
  scales?: FacetScales;
}

export interface PointLayerInput extends LayerInputBase {
  geom: "point";
  stat?: "identity";
  position?: PointPosition;
  positionParams?: PositionParams;
  params?: PointParams;
}

export interface LineLayerInput extends LayerInputBase {
  geom: "line";
  stat?: "identity";
  position?: "identity";
  params?: LineParams;
}

export interface ColLayerInput extends LayerInputBase {
  geom: "col";
  stat?: "identity";
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

export interface AreaLayerInput extends LayerInputBase {
  geom: "area";
  stat?: "identity";
  position?: StackablePosition;
  params?: AreaParams;
}

export interface RuleLayerInput extends LayerInputBase {
  geom: "rule";
  stat?: "identity";
  position?: "identity";
  params?: RuleParams;
}

export interface TextLayerInput extends LayerInputBase {
  geom: "text";
  stat?: "identity";
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

export interface ErrorbarLayerInput extends LayerInputBase {
  geom: "errorbar";
  stat?: "identity" | "summary";
  position?: "identity";
  params?: ErrorbarParams;
}

export interface RectLayerInput extends LayerInputBase {
  geom: "rect";
  stat?: "identity";
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
  stat?: "identity";
  position?: "identity";
  params?: RibbonParams;
}

export interface SegmentLayerInput extends LayerInputBase {
  geom: "segment";
  stat?: "identity";
  position?: "identity";
  params?: SegmentParams;
}

/** Layer accepted at the TS/builder level. */
export type LayerInput =
  | PointLayerInput
  | LineLayerInput
  | ColLayerInput
  | BarLayerInput
  | HistogramLayerInput
  | AreaLayerInput
  | RibbonLayerInput
  | RuleLayerInput
  | TextLayerInput
  | SmoothLayerInput
  | BoxplotLayerInput
  | DensityLayerInput
  | ErrorbarLayerInput
  | RectLayerInput
  | TileLayerInput
  | RasterLayerInput
  | SegmentLayerInput;

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
