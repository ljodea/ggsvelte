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
  PointParams,
  PointPosition,
  PositionParams,
  RasterParams,
  RectParams,
  RenderBackend,
  RuleParams,
  SegmentParams,
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
  position?: PointPosition;
  positionParams?: PositionParams;
}

/** Line-layer sugar options: params plus an optional layer-level aes. */
export interface GeomLineOptions extends LineParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Col-layer sugar options: params plus aes and a position override. */
export interface GeomColOptions extends ColParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Bar-layer sugar options: params plus aes and a position override. */
export interface GeomBarOptions extends BarParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
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
  stat?: "identity" | "summary";
}

/** Rect-layer sugar options: params plus optional layer-level aes. */
export interface GeomRectOptions extends RectParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
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
}

/** Area-layer sugar options: params plus aes and a position override. */
export interface GeomAreaOptions extends AreaParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Rule-layer sugar options: params (incl. annotation intercepts) plus aes. */
export interface GeomRuleOptions extends RuleParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Segment-layer sugar options: params plus optional layer-level aes. */
export interface GeomSegmentOptions extends SegmentParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Text-layer sugar options: params plus an optional layer-level aes. */
export interface GeomTextOptions extends TextParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}
