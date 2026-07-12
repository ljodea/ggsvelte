/**
 * RuntimeSpec — the in-memory superset of PortableSpec (plan: "Two spec
 * types, explicitly split"). It adds `{ fn }` channel accessors, which cannot
 * travel as JSON. Every PortableSpec is a valid RuntimeSpec.
 *
 * Narrow with `isPortable()`; convert with `toPortable()` (rejecting) or
 * `toPortableLossy()` (explicit tooling path) from `portability.ts`.
 *
 * M0c note: the pipeline consumes PortableSpec; `{ fn }` accessor EXECUTION
 * is an M1 concern. The type + conversion contract lands now so the split is
 * part of the public API from the start.
 */
import type {
  AreaParams,
  BarParams,
  BoxplotParams,
  ChannelValue,
  ColParams,
  DataRef,
  DensityParams,
  ErrorbarParams,
  GeomName,
  InlineData,
  Labs,
  LegendSpec,
  LineParams,
  PointParams,
  PointPosition,
  PositionParams,
  RuleParams,
  Scales,
  SmoothParams,
  StackablePosition,
  TextParams,
  ThemeName,
  ThemeSpec,
} from "./schema.js";

/** A function channel accessor: computes the channel value per row. */
export interface ChannelFn {
  fn: (row: Record<string, unknown>, index: number) => unknown;
}

/** A channel value that may also be a function accessor (runtime only). */
export type RuntimeChannelValue = ChannelValue | ChannelFn;

/** Aes whose channels may be function accessors. */
export interface RuntimeAes {
  x?: RuntimeChannelValue;
  y?: RuntimeChannelValue;
  color?: RuntimeChannelValue;
  fill?: RuntimeChannelValue;
  size?: RuntimeChannelValue;
  linewidth?: RuntimeChannelValue;
  alpha?: RuntimeChannelValue;
  group?: RuntimeChannelValue;
  label?: RuntimeChannelValue;
  weight?: RuntimeChannelValue;
  ymin?: RuntimeChannelValue;
  ymax?: RuntimeChannelValue;
}

interface RuntimeLayerBase {
  geom: GeomName;
  aes?: RuntimeAes;
}

export interface RuntimePointLayer extends RuntimeLayerBase {
  geom: "point";
  stat?: "identity";
  position?: PointPosition;
  positionParams?: PositionParams;
  params?: PointParams;
}

export interface RuntimeLineLayer extends RuntimeLayerBase {
  geom: "line";
  stat?: "identity";
  position?: "identity";
  params?: LineParams;
}

export interface RuntimeColLayer extends RuntimeLayerBase {
  geom: "col";
  stat?: "identity";
  position?: StackablePosition;
  params?: ColParams;
}

export interface RuntimeBarLayer extends RuntimeLayerBase {
  geom: "bar";
  stat?: "count" | "bin";
  position?: StackablePosition;
  params?: BarParams;
}

export interface RuntimeHistogramLayer extends RuntimeLayerBase {
  geom: "histogram";
  stat?: "bin";
  position?: StackablePosition;
  params?: BarParams;
}

export interface RuntimeAreaLayer extends RuntimeLayerBase {
  geom: "area";
  stat?: "identity";
  position?: StackablePosition;
  params?: AreaParams;
}

export interface RuntimeRuleLayer extends RuntimeLayerBase {
  geom: "rule";
  stat?: "identity";
  position?: "identity";
  params?: RuleParams;
}

export interface RuntimeTextLayer extends RuntimeLayerBase {
  geom: "text";
  stat?: "identity";
  position?: "identity" | "nudge";
  positionParams?: PositionParams;
  params?: TextParams;
}

export interface RuntimeSmoothLayer extends RuntimeLayerBase {
  geom: "smooth";
  stat?: "smooth";
  position?: "identity";
  params?: SmoothParams;
}

export interface RuntimeBoxplotLayer extends RuntimeLayerBase {
  geom: "boxplot";
  stat?: "boxplot";
  position?: "dodge" | "identity";
  params?: BoxplotParams;
}

export interface RuntimeDensityLayer extends RuntimeLayerBase {
  geom: "density";
  stat?: "density";
  position?: "identity";
  params?: DensityParams;
}

export interface RuntimeErrorbarLayer extends RuntimeLayerBase {
  geom: "errorbar";
  stat?: "identity" | "summary";
  position?: "identity";
  params?: ErrorbarParams;
}

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
export interface RuntimeSpec {
  $schema?: string;
  data?: DataRef;
  datasets?: Record<string, InlineData>;
  aes?: RuntimeAes;
  layers: RuntimeLayerSpec[];
  scales?: Scales;
  legend?: LegendSpec;
  labs?: Labs;
  theme?: ThemeName | ThemeSpec;
  width?: number;
  height?: number;
}
