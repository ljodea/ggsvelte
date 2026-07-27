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
  Density2dParams,
  DotplotParams,
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
  HlineParams,
  VlineParams,
  SegmentParams,
  AblineParams,
  QuantileParams,
  CurveParams,
  ContourParams,
  MapParams,
  SfParams,
  SfTextParams,
  SfLabelParams,
  SpokeParams,
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
   * "identity" (default), "unique", "connect" (#816), "manual" (#814),
   * or "ellipse" (bivariate normal rings; #812).
   */
  stat?: "identity" | "unique" | "connect" | "manual" | "ellipse";
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

/** Contour isoline sugar options (#801). */
export interface GeomContourOptions extends ContourParams, GeomDataOption {
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

/** 2D density isoline sugar options (#802). */
export interface GeomDensity2dOptions extends Density2dParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Dotplot-layer sugar options (histodot + stack; #803). */
export interface GeomDotplotOptions extends DotplotParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Filled 2D density-layer sugar (#802 phase 2). */
export interface GeomDensity2dFilledOptions extends Density2dParams, GeomDataOption {
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

/** Hline alias sugar: yintercept annotation (or map aes.y). */
export interface GeomHlineOptions extends HlineParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Vline alias sugar: xintercept annotation (or map aes.x). */
export interface GeomVlineOptions extends VlineParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/**
 * Jitter alias sugar: point params + flat width/height/seed (assembled into
 * positionParams by geomJitter — not a normalize peel).
 */
export interface GeomJitterOptions extends PointParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
  /** Maximum horizontal jitter (data units / band-step fraction). */
  width?: number;
  /** Maximum vertical jitter (data units / band-step fraction). */
  height?: number;
  /** Seeded RNG seed (ggsvelte jitter is always seeded; default 42). */
  seed?: number;
  positionParams?: PositionParams;
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

/** Map-layer sugar options (fortified join; #808). map is required. */
export interface GeomMapOptions extends MapParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Options for .geomSf() — portable GeoJSON geometries (#809). */
export interface GeomSfOptions extends SfParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** SF text-layer sugar: labels at representative geometry points (#809 phase 2). */
export interface GeomSfTextOptions extends SfTextParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** SF label-layer sugar: boxed labels at representative geometry points (#809 phase 3). */
export interface GeomSfLabelOptions extends SfLabelParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Blank-layer sugar options: scale-training only; no paint params. */
export interface GeomBlankOptions extends GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Spoke-layer sugar: origin + angle + radius (#810). */
export interface GeomSpokeOptions extends SpokeParams, GeomDataOption {
  aes?: AesInput;
  render?: RenderBackend;
}

/** Abline-layer sugar options: slope/intercept annotation params. */
export interface GeomAblineOptions extends AblineParams, GeomDataOption {
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
