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
  LayerSpec,
  LineLayer,
  PointLayer,
  PortableSpec,
  RuleLayer,
  SmoothLayer,
  TextLayer,
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
export interface RuntimeColLayer extends WithRuntimeAes<ColLayer> {}
export interface RuntimeBarLayer extends WithRuntimeAes<BarLayer> {}
export interface RuntimeHistogramLayer extends WithRuntimeAes<HistogramLayer> {}
export interface RuntimeAreaLayer extends WithRuntimeAes<AreaLayer> {}
export interface RuntimeRuleLayer extends WithRuntimeAes<RuleLayer> {}
export interface RuntimeTextLayer extends WithRuntimeAes<TextLayer> {}
export interface RuntimeSmoothLayer extends WithRuntimeAes<SmoothLayer> {}
export interface RuntimeBoxplotLayer extends WithRuntimeAes<BoxplotLayer> {}
export interface RuntimeDensityLayer extends WithRuntimeAes<DensityLayer> {}
export interface RuntimeErrorbarLayer extends WithRuntimeAes<ErrorbarLayer> {}

export type RuntimeLayerSpec =
  | RuntimePointLayer
  | RuntimeLineLayer
  | RuntimeColLayer
  | RuntimeBarLayer
  | RuntimeHistogramLayer
  | RuntimeAreaLayer
  | RuntimeRuleLayer
  | RuntimeTextLayer
  | RuntimeSmoothLayer
  | RuntimeBoxplotLayer
  | RuntimeDensityLayer
  | RuntimeErrorbarLayer;

/** The in-memory spec superset ({ fn } channel accessors allowed). */
type RuntimeSpecPortableFields = Omit<PortableSpec, "aes" | "layers">;
export interface RuntimeSpec extends RuntimeSpecPortableFields {
  aes?: RuntimeAes;
  layers: RuntimeLayerSpec[];
}
