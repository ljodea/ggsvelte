/**
 * Geom sugar option types for the fluent builder.
 * Methods: builder.ts. Scale sugar: builder-scales.ts.
 */
import type { DataInput } from "./builder-data.js";
import type { AesInput } from "./normalize.js";
import type {
  AreaParams,
  BarParams,
  BoxplotParams,
  ColParams,
  DensityParams,
  ErrorbarParams,
  RibbonParams,
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
  QuantileParams,
  CurveParams,
  SmoothParams,
  StackablePosition,
  TextParams,
  TileParams,
} from "./schema.js";

/** Shared sugar for per-layer data (#589). */
interface GeomDataOption {
  /** Optional layer-local data; inherits plot data when omitted. */
  data?: DataInput;
}

/** Point-layer sugar options: params plus aes and position (jitter/nudge). */
export interface GeomPointOptions extends PointParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** identity | unique | summary_bin (#817) | manual (#814). */
  stat?: "identity" | "unique" | "summary_bin" | "manual";
  position?: PointPosition;
  positionParams?: PositionParams;
}

/** Line-layer sugar options: LineParams (style + optional stat-bin / connect knobs). */
export interface GeomLineOptions extends LineParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /**
   * identity (default) | unique (#813) | bin (freqpoly / #796) |
   * align (shared continuous-x grid for stack/fill; #815) |
   * connect (expand successive points; #816) |
   * summary_bin (#817) | manual (#814).
   */
  stat?: "identity" | "unique" | "bin" | "align" | "connect" | "summary_bin" | "manual";
}

/** Path-layer sugar options (data-order polylines; style + optional connect). */
export interface GeomPathOptions extends PathParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /**
   * "identity" (default), "unique", "connect" (#816), or "manual" (#814).
   */
  stat?: "identity" | "unique" | "connect" | "manual";
}

/** Col-layer sugar options: params plus aes and a position override. */
export interface GeomColOptions extends ColParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique";
  position?: StackablePosition;
}

/** Bar-layer sugar options: params plus aes and a position override. */
export interface GeomBarOptions extends BarParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Freqpoly sugar: bin params + line styling (normalize → line + bin). */
export interface GeomFreqpolyOptions extends LineParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Histogram-layer sugar options: bin params plus aes and a position override. */
export interface GeomHistogramOptions extends BarParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Smooth-layer sugar options: params plus an optional layer-level aes. */
export interface GeomSmoothOptions extends SmoothParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Quantile-layer sugar options: linear RQ lines (#805). */
export interface GeomQuantileOptions extends QuantileParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Boxplot-layer sugar options: params plus aes and a position override. */
export interface GeomBoxplotOptions extends BoxplotParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  position?: "dodge" | "identity";
}

/** Density-layer sugar options: params plus an optional layer-level aes. */
export interface GeomDensityOptions extends DensityParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Errorbar-layer sugar options: params plus aes and a stat override. */
export interface GeomErrorbarOptions extends ErrorbarParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  stat?: "identity" | "unique" | "summary" | "summary_bin";
}

/** Rect-layer sugar options: params plus optional layer-level aes. */
export interface GeomRectOptions extends RectParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique";
}

/** Tile-layer sugar options: params plus optional layer-level aes. */
export interface GeomTileOptions extends TileParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Raster-layer sugar options: params plus optional layer-level aes. */
export interface GeomRasterOptions extends RasterParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Ribbon-layer sugar options: params plus an optional layer-level aes. */
export interface GeomRibbonOptions extends RibbonParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique";
}

/** Area-layer sugar options: params plus aes and a position override. */
export interface GeomAreaOptions extends AreaParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique" | "align";
  position?: StackablePosition;
}

/** Rule-layer sugar options: params (incl. annotation intercepts) plus aes. */
export interface GeomRuleOptions extends RuleParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique";
}

/** Segment-layer sugar options: params plus optional layer-level aes. */
export interface GeomSegmentOptions extends SegmentParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique";
}

/** Curve-layer sugar: curvature/angle/ncp + stroke styling. */
export interface GeomCurveOptions extends CurveParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Text-layer sugar options: params plus an optional layer-level aes. */
export interface GeomTextOptions extends TextParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** "identity" (default) or "unique" (dedupe mapped aesthetics; first wins). */
  stat?: "identity" | "unique";
}
