/**
 * Geom sugar option types for the fluent builder.
 * Methods: builder.ts. Scale sugar: builder-scales.ts.
 */
import type { AesInput } from "./normalize.js";
import type {
  AreaParams,
  BarParams,
  BoxplotParams,
  ColParams,
  DensityParams,
  ErrorbarParams,
  LineParams,
  PointParams,
  PointPosition,
  PositionParams,
  RenderBackend,
  RuleParams,
  SmoothParams,
  StackablePosition,
  TextParams,
} from "./schema.js";

/** Point-layer sugar options: params plus aes and position (jitter/nudge). */
export interface GeomPointOptions extends PointParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: PointPosition;
  positionParams?: PositionParams;
}

/** Line-layer sugar options: params plus an optional layer-level aes. */
export interface GeomLineOptions extends LineParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Col-layer sugar options: params plus aes and a position override. */
export interface GeomColOptions extends ColParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Bar-layer sugar options: params plus aes and a position override. */
export interface GeomBarOptions extends BarParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Histogram-layer sugar options: bin params plus aes and a position override. */
export interface GeomHistogramOptions extends BarParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Smooth-layer sugar options: params plus an optional layer-level aes. */
export interface GeomSmoothOptions extends SmoothParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Boxplot-layer sugar options: params plus aes and a position override. */
export interface GeomBoxplotOptions extends BoxplotParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: "dodge" | "identity";
}

/** Density-layer sugar options: params plus an optional layer-level aes. */
export interface GeomDensityOptions extends DensityParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Errorbar-layer sugar options: params plus aes and a stat override. */
export interface GeomErrorbarOptions extends ErrorbarParams {
  aes?: AesInput;
  render?: RenderBackend;
  stat?: "identity" | "summary";
}

/** Area-layer sugar options: params plus aes and a position override. */
export interface GeomAreaOptions extends AreaParams {
  aes?: AesInput;
  render?: RenderBackend;
  position?: StackablePosition;
}

/** Rule-layer sugar options: params (incl. annotation intercepts) plus aes. */
export interface GeomRuleOptions extends RuleParams {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Text-layer sugar options: params plus an optional layer-level aes. */
export interface GeomTextOptions extends TextParams {
  aes?: AesInput;
  render?: RenderBackend;
}
