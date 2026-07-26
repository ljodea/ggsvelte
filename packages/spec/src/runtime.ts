/**
 * RuntimeSpec — the in-memory superset of PortableSpec (plan: "Two spec
 * types, explicitly split"). It adds `{ fn }` channel accessors, which cannot
 * travel as JSON. Every PortableSpec is a valid RuntimeSpec.
 *
 * Narrow with `isPortable()`; convert with `toPortable()` (rejecting) or
 * `toPortableLossy()` (explicit tooling path) from `portability.ts`.
 *
 * The runtime types are projected from their portable counterparts rather
 * than duplicating the public surface. New portable plot or layer fields are
 * therefore inherited automatically; only `aes` is widened for accessors.
 *
 * The pipeline still consumes PortableSpec. `{ fn }` accessor execution is
 * future work: this module defines the in-memory type and conversion boundary,
 * not an execution promise.
 */
import type {
  Aes,
  AreaLayer,
  BarLayer,
  BoxplotLayer,
  ChannelValue,
  ColLayer,
  DensityLayer,
  ErrorbarLayer,
  HistogramLayer,
  FreqpolyLayer,
  LayerSpec,
  LineLayer,
  MapLayer,
  SfLayer,
  SfTextLayer,
  PathLayer,
  PointLayer,
  PortableSpec,
  RasterLayer,
  RectLayer,
  RibbonLayer,
  SegmentLayer,
  ContourLayer,
  CurveLayer,
  Density2dLayer,
  Density2dFilledLayer,
  DotplotLayer,
  RuleLayer,
  QuantileLayer,
  SmoothLayer,
  TextLayer,
  TileLayer,
} from "./schema.js";

/** A function channel accessor: computes the channel value per row. */
export interface ChannelFn {
  fn: (row: Record<string, unknown>, index: number) => unknown;
}

/** A channel value that may also be a function accessor (runtime only). */
export type RuntimeChannelValue = ChannelValue | ChannelFn;

/** Aes whose channels may be function accessors. */
type RuntimeAesFields = {
  [Channel in keyof Aes]: Exclude<Aes[Channel], undefined> | ChannelFn;
};
export interface RuntimeAes extends RuntimeAesFields {}

type WithRuntimeAes<Layer extends LayerSpec> = Omit<Layer, "aes"> & {
  aes?: RuntimeAes;
};

export interface RuntimePointLayer extends WithRuntimeAes<PointLayer> {}
export interface RuntimeLineLayer extends WithRuntimeAes<LineLayer> {}
export interface RuntimePathLayer extends WithRuntimeAes<PathLayer> {}
export interface RuntimeColLayer extends WithRuntimeAes<ColLayer> {}
export interface RuntimeBarLayer extends WithRuntimeAes<BarLayer> {}
export interface RuntimeHistogramLayer extends WithRuntimeAes<HistogramLayer> {}
export interface RuntimeFreqpolyLayer extends WithRuntimeAes<FreqpolyLayer> {}
export interface RuntimeAreaLayer extends WithRuntimeAes<AreaLayer> {}
export interface RuntimeRibbonLayer extends WithRuntimeAes<RibbonLayer> {}
export interface RuntimeSegmentLayer extends WithRuntimeAes<SegmentLayer> {}
export interface RuntimeCurveLayer extends WithRuntimeAes<CurveLayer> {}
export interface RuntimeRuleLayer extends WithRuntimeAes<RuleLayer> {}
export interface RuntimeTextLayer extends WithRuntimeAes<TextLayer> {}
export interface RuntimeSmoothLayer extends WithRuntimeAes<SmoothLayer> {}
export interface RuntimeQuantileLayer extends WithRuntimeAes<QuantileLayer> {}
export interface RuntimeBoxplotLayer extends WithRuntimeAes<BoxplotLayer> {}
export interface RuntimeDensityLayer extends WithRuntimeAes<DensityLayer> {}
export interface RuntimeErrorbarLayer extends WithRuntimeAes<ErrorbarLayer> {}
export interface RuntimeRectLayer extends WithRuntimeAes<RectLayer> {}
export interface RuntimeTileLayer extends WithRuntimeAes<TileLayer> {}
export interface RuntimeRasterLayer extends WithRuntimeAes<RasterLayer> {}
export interface RuntimeContourLayer extends WithRuntimeAes<ContourLayer> {}
export interface RuntimeDensity2dLayer extends WithRuntimeAes<Density2dLayer> {}
export interface RuntimeDensity2dFilledLayer extends WithRuntimeAes<Density2dFilledLayer> {}
export interface RuntimeDotplotLayer extends WithRuntimeAes<DotplotLayer> {}
export interface RuntimeMapLayer extends WithRuntimeAes<MapLayer> {}
export interface RuntimeSfLayer extends WithRuntimeAes<SfLayer> {}
export interface RuntimeSfTextLayer extends WithRuntimeAes<SfTextLayer> {}

export type RuntimeLayerSpec =
  | RuntimePointLayer
  | RuntimeLineLayer
  | RuntimePathLayer
  | RuntimeColLayer
  | RuntimeBarLayer
  | RuntimeHistogramLayer
  | RuntimeFreqpolyLayer
  | RuntimeAreaLayer
  | RuntimeRibbonLayer
  | RuntimeSegmentLayer
  | RuntimeCurveLayer
  | RuntimeRuleLayer
  | RuntimeTextLayer
  | RuntimeSmoothLayer
  | RuntimeQuantileLayer
  | RuntimeBoxplotLayer
  | RuntimeDensityLayer
  | RuntimeErrorbarLayer
  | RuntimeRectLayer
  | RuntimeTileLayer
  | RuntimeRasterLayer
  | RuntimeContourLayer
  | RuntimeDensity2dLayer
  | RuntimeDensity2dFilledLayer
  | RuntimeDotplotLayer
  | RuntimeMapLayer
  | RuntimeSfLayer
  | RuntimeSfTextLayer;

/** The in-memory spec superset ({ fn } channel accessors allowed). */
type RuntimeSpecPortableFields = Omit<PortableSpec, "aes" | "layers">;
export interface RuntimeSpec extends RuntimeSpecPortableFields {
  aes?: RuntimeAes;
  layers: RuntimeLayerSpec[];
}
