/**
 * Builder-level layer-input types — mark families: point/line/bar/area
 * marks, text labels, fit layers (smooth/quantile/contour), and distribution
 * & range plots. LayerInputBase anchors every *LayerInput; the full
 * LayerInput union lives in normalize-input-layers-special.ts alongside the
 * remaining geom families.
 */
import type {
  AreaParams,
  BarParams,
  BoxplotParams,
  ColParams,
  ContourParams,
  CrossbarParams,
  DataRef,
  Density2dParams,
  DensityParams,
  DotplotParams,
  ErrorbarParams,
  HlineParams,
  LabelParams,
  LineParams,
  LinerangeParams,
  PathParams,
  PointParams,
  PointPosition,
  PointrangeParams,
  PositionParams,
  QuantileParams,
  RenderBackend,
  RibbonParams,
  RuleParams,
  SmoothParams,
  StackablePosition,
  TextParams,
  VlineParams,
  ViolinParams,
} from "./schema.js";
import type { AesInput } from "./normalize-input.js";

export interface LayerInputBase {
  aes?: AesInput;
  /**
   * Optional layer-local data. When omitted, the layer inherits plot-level
   * `data`. Accepts the same DataRef forms as plot-level data.
   */
  data?: DataRef;
  /** Rendering backend hint ("auto" is the default and canonicalizes away). */
  render?: RenderBackend;
  /**
   * Set false to exclude this layer from inspection (#1068): its marks never
   * become tooltip, hover, or keyboard-traversal candidates. For decorative
   * layers whose marks would otherwise capture the pointer. Schema admits
   * only the literal `false` (same contract as GeomProps / PortableSpec).
   */
  inspect?: false;
}

export interface PointLayerInput extends LayerInputBase {
  geom: "point";
  stat?: "identity" | "unique" | "summary_bin" | "summary_rolling" | "manual" | "sum";
  position?: PointPosition;
  positionParams?: PositionParams;
  params?: PointParams;
}

export interface CountLayerInput extends LayerInputBase {
  geom: "count";
  stat?: "sum";
  position?: PointPosition;
  positionParams?: PositionParams;
  params?: PointParams;
}

export interface LineLayerInput extends LayerInputBase {
  geom: "line";
  /** identity | unique | bin | align | connect | summary_bin | manual | ecdf */
  stat?:
    | "identity"
    | "unique"
    | "bin"
    | "align"
    | "connect"
    | "summary_bin"
    | "summary_rolling"
    | "manual"
    | "ecdf";
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

export interface RibbonLayerInput extends LayerInputBase {
  geom: "ribbon";
  stat?: "identity" | "unique";
  position?: "identity";
  params?: RibbonParams;
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

export interface LabelLayerInput extends LayerInputBase {
  geom: "label";
  stat?: "identity";
  position?: "identity" | "nudge";
  positionParams?: PositionParams;
  params?: LabelParams;
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

export interface ViolinLayerInput extends LayerInputBase {
  geom: "violin";
  stat?: "ydensity";
  position?: "dodge" | "identity";
  params?: ViolinParams;
}
