/**
 * Builder-level layer-input types — surface & special geoms (2d bins, tiles,
 * raster/hex, sf & map, model fits, annotations) plus the LayerInput union
 * spanning both layer families.
 */
import type {
  AblineParams,
  Bin2dParams,
  BlankParams,
  CurveParams,
  FunctionParams,
  HexParams,
  MapParams,
  PolygonParams,
  QqLineParams,
  QqParams,
  RasterParams,
  RectParams,
  RugParams,
  SegmentParams,
  SfLabelParams,
  SfParams,
  SfTextParams,
  SpokeParams,
  StepParams,
  TileParams,
} from "./schema.js";
import type {
  AreaLayerInput,
  BarLayerInput,
  BoxplotLayerInput,
  ColLayerInput,
  ContourLayerInput,
  CountLayerInput,
  CrossbarLayerInput,
  Density2dFilledLayerInput,
  Density2dLayerInput,
  DensityLayerInput,
  DotplotLayerInput,
  ErrorbarLayerInput,
  FreqpolyLayerInput,
  HistogramLayerInput,
  HlineLayerInput,
  JitterLayerInput,
  LabelLayerInput,
  LayerInputBase,
  LineLayerInput,
  LinerangeLayerInput,
  PathLayerInput,
  PointLayerInput,
  PointrangeLayerInput,
  QuantileLayerInput,
  RibbonLayerInput,
  RuleLayerInput,
  SmoothLayerInput,
  TextLayerInput,
  ViolinLayerInput,
  VlineLayerInput,
} from "./normalize-input-layers-marks.js";

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

export interface SegmentLayerInput extends LayerInputBase {
  geom: "segment";
  stat?: "identity" | "unique";
  position?: "identity";
  params?: SegmentParams;
}

export interface FunctionLayerInput extends LayerInputBase {
  geom: "function";
  stat?: "function";
  position?: "identity";
  params: FunctionParams;
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
  | LabelLayerInput
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
  | SegmentLayerInput
  | CountLayerInput
  | ViolinLayerInput
  | HexLayerInput
  | FunctionLayerInput
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
