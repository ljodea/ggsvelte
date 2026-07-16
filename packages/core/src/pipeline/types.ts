/**
 * Pipeline public contract and shared internal frame types.
 * Split out of pipeline.ts so geometry/facets/orchestrator can share them
 * without circular imports.
 */
import type { LayerSpec, PositionScaleSpec } from "@ggsvelte/spec";

import type { SequentialColorScale } from "../scales/color.js";
import type { ScaleState } from "../scales/state.js";
import type { ColorScale, PositionScale } from "../scales/train.js";
import type { Scene } from "../scene.js";
import type { CellValue, Columns, ColumnTable, Rows } from "../table.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { EditionDefaults } from "../editions.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface Advisory {
  code: string;
  /** Where the decision applies (e.g. "scales.x"). */
  path: string;
  /** What was chosen. */
  chosen: string;
  /** How to override the heuristic. */
  howToOverride: string;
}

/** A data-level problem that did not stop the render. */
export interface PipelineWarning {
  code: string;
  message: string;
}

/** A spec- or input-level problem that stops the render (structured). */
export class PipelineError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.path = path;
  }
}

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

/** Named data acceptable at run time: rows, columns, or the inline forms. */
export type NamedData = Rows | Columns | { values: Rows } | { columns: Columns };

export interface RunOptions {
  /** Plot width in px (required — container sizing is the adapter's job). */
  width: number;
  /** Plot height in px. */
  height: number;
  /** Named datasets resolvable by { name } data refs. */
  data?: Record<string, NamedData>;
  /** Allow RunOptions.data to shadow spec.datasets on name collision. */
  allowOverride?: boolean;
  /** Text measurer; defaults to the canonical deterministic metrics table. */
  measureText?: TextMeasurer;
  /** Previously committed scale state (value-stable color assignments). */
  prevScales?: Record<string, ScaleState>;
  /** Mark-count threshold above which `render: "auto"` layers resolve to
   *  canvas (default 2000, benchmark-tuned; advisory `canvas-auto`). */
  canvasThreshold?: number;
  /** Defaults-edition table override (editions.ts). Run-scoped — no global
   *  registry; used by tests proving edition stability and by future
   *  edition rollouts. Defaults to EDITION_DEFAULTS. */
  editions?: Readonly<Record<number, EditionDefaults>>;
  /** Latest data-derived domains retained by an interaction controller while
   * an explicit zoom domain is effective. Omit for an unzoomed render. */
  baselineDomains?: ScaleDomainSnapshot;
  /** Unzoomed positional scale configuration. When supplied, the pipeline
   * trains the latest natural baseline from this run's data while rendering
   * with the spec's effective (typically explicit zoom) domains. Missing
   * axes mean natural default scale configuration. `baselineDomains` wins. */
  baselineScales?: Readonly<{
    x?: PositionScaleSpec;
    y?: PositionScaleSpec;
  }>;
}

/** Default `render: "auto"` mark-count threshold for the canvas backend. */
export const CANVAS_AUTO_THRESHOLD = 2000;

// ---------------------------------------------------------------------------
// Shared internal frame / binding types
// ---------------------------------------------------------------------------

/** Sentinel source-row index for synthesized geometry (stat-only marks). */
export const NO_ROW = 0xffffffff;

export interface ColorBinding {
  field: string | null;
  /** Literal (non-scaled) constant, if any. */
  constant: string | null;
  /** Scaled constant ({value, scale: true}), if any. */
  scaledConstant: CellValue | null;
}

export type RuleForm = "annotation" | "vertical" | "horizontal";

export interface LayerBinding {
  layer: LayerSpec;
  index: number;
  xField: string | null;
  yField: string | null;
  /** The stat-generated column the y channel maps ({ stat: ... }), if any. */
  yStatColumn: string | null;
  yminField: string | null;
  ymaxField: string | null;
  color: ColorBinding;
  fill: ColorBinding;
  labelField: string | null;
  labelConstant: string | null;
  weightField: string | null;
  ruleForm: RuleForm | null;
}

interface BoxFrame {
  lower: Float64Array;
  middle: Float64Array;
  upper: Float64Array;
  outlierX: CellValue[];
  outlierY: Float64Array;
  /** Box row each outlier belongs to (dodge offsets follow the box). */
  outlierBox: Uint32Array;
  /** Original source row represented by each outlier point. */
  outlierRow: Uint32Array;
}

export interface LayerFrame {
  binding: LayerBinding;
  /** The (facet-panel) table this frame was computed from. */
  table: ColumnTable;
  /** Post-stat row count. */
  n: number;
  xValues: readonly CellValue[] | null;
  xNumeric: Float64Array | null;
  yNumeric: Float64Array | null;
  groups: readonly number[];
  /** Source row per post-stat row (NO_ROW for synthesized rows). */
  rowIndex: Uint32Array;
  colorValues: readonly CellValue[] | null;
  fillValues: readonly CellValue[] | null;
  labelValues: readonly CellValue[] | null;
  /** Post-position / stat bounds (bars, areas, bands, boxes, errorbars). */
  ymin: Float64Array | null;
  ymax: Float64Array | null;
  /** Bin edges (bin-stat layers; rects span them on a continuous x). */
  xmin: Float64Array | null;
  xmax: Float64Array | null;
  dodgeSlot: Uint32Array | null;
  /** Per-row dodge slot count (per-x, ggplot2 preserve="total"). */
  dodgeSlotCounts: Uint32Array | null;
  /** Jitter/nudge offsets (data units / band-step fractions). */
  offsetX: Float64Array | null;
  offsetY: Float64Array | null;
  /** Boxplot-stat extras. */
  box: BoxFrame | null;
  /** Smooth-stat: the layer draws a se ribbon (ymin/ymax are the band). */
  smoothBand: boolean;
  /** Annotation-rule intercepts (data units). */
  xIntercepts: CellValue[];
  yIntercepts: CellValue[];
}

/** Per-mark color lookup over a resolved scale (unknown values render grey). */
export function colorOf(resolved: ResolvedColorScale, value: CellValue): string {
  return resolved.scale.colorOf(value) ?? "#999999";
}
