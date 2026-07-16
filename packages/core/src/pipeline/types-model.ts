/**
 * Pipeline model types: trained scales, domain snapshots, and RenderModel.
 */
import type { SequentialColorScale } from "../scales/color.js";
import type { ScaleState } from "../scales/state.js";
import type { ColorScale, PositionScale } from "../scales/train.js";
import type { Scene } from "../scene.js";
import type { CellValue } from "../table.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

import type { Advisory, PipelineWarning } from "./types-advisory.js";

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

export interface RenderModel {
  scene: Scene;
  scales: TrainedScales;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  /** Monotonic run identity (module-global, increases every runPipeline call). */
  runId: number;
  /**
   * Resolved rendering backend per layer: the layer's `render` hint, with
   * "auto" resolving to canvas above the mark-count threshold (advisory
   * `canvas-auto`), and `a11y: "force-svg"` forcing every layer to "svg".
   * renderToSVGString ignores this (always all-SVG).
   */
  layerBackends: LayerBackend[];
  /** Field-mapped channels per layer (drives default tooltip content). */
  layerFields: MappedField[][];
  /**
   * Scaled constant aes values per layer (`{ value, scale: true }` on color/fill).
   * Used by legend-focus key indexing when no field mapping exists for a scale.
   */
  layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>>;
  /** Stable baseline plus the domains actually used for this render. */
  domains: Readonly<{ baseline: ScaleDomainSnapshot; effective: ScaleDomainSnapshot }>;
  /** Interned source-row memberships. Public adapters resolve these through keys. */
  lineage: LineageStore<number>;
  /** Shared epoch-scoped interaction candidate storage. */
  candidates: CandidateStore;
  /** Trained semantic formatters. Coord transforms never swap x and y here. */
  axisFormatters: Readonly<{ x: AxisValueFormatter; y: AxisValueFormatter }>;
  /** The source data row behind a hit-index rowIndex (null for synthesized
   *  stat rows). Reads the bound table — do not call after dispose(). */
  row(index: number): Record<string, CellValue> | null;
  /**
   * Release this model's geometry and caches (plan: memory ownership). The
   * Svelte adapter disposes the previous model on commit and the current one
   * on unmount. After dispose() the scene's batches are empty and row()
   * returns null; rendering a disposed model is a caller bug.
   */
  dispose(): void;
}
