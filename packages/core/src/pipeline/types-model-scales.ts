/**
 * Trained scale and domain snapshot types on the public RenderModel.
 */
import type { SequentialColorScale } from "../scales/color.js";
import type { ScaleState } from "../scales/state.js";
import type { ColorScale, PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";

/** A resolved color-ish scale: value-stable ordinal or sequential ramp. */
export type ResolvedColorScale =
  | { kind: "ordinal"; scale: ColorScale }
  | { kind: "sequential"; scale: SequentialColorScale };

export interface TrainedScales {
  /** The shared x scale (union-trained). Free-x facets ALSO train per panel
   *  — see `panels`. */
  x: PositionScale;
  y: PositionScale;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  /** Per-panel positional scales (facets; equal to x/y when fixed). */
  panels: { x: PositionScale; y: PositionScale }[];
  /** Serializable per-scale-name state (plain JSON). Commit only when this
   *  model's runId is still the latest — that is the transactionality rule. */
  state: Record<string, ScaleState>;
}

export interface ScaleDomainSnapshot {
  readonly x: readonly CellValue[];
  readonly y: readonly CellValue[];
  readonly panels: readonly Readonly<{
    x: readonly CellValue[];
    y: readonly CellValue[];
  }>[];
}

/** Format a logical value using its trained semantic positional axis. */
export type AxisValueFormatter = (value: CellValue) => string;

/** Resolved rendering backend per layer (after hints/threshold/a11y). */
export type LayerBackend = "svg" | "canvas";

/** A field-mapped channel of one layer (tooltip content contract). */
export interface MappedField {
  channel: string;
  field: string;
  /** Stat output rather than a source-table column. Its semantic x/y value
   *  is available directly on CandidateFacts for synthesized marks. */
  source?: "stat";
}
