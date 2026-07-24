/**
 * Post-stat LayerFrame: panel-local geometry inputs after bind + stat + position.
 *
 * Shape: a narrow shared core (columns · x/y · group · lineage) plus optional
 * per-geom payloads. Geometry modules own their payload fields; shared stages
 * and candidate-construction read only the core (and lineage after finalize).
 */
import type { CellValue, ColumnTable } from "../table.js";

import type { LayerBinding } from "./types-binding.js";

type StyleValueColumn = readonly CellValue[] | Float64Array;

/** Boxplot-stat extras (owned by boxplot geometry + outlier lineage). */
export interface BoxPayload {
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

/** @deprecated Prefer {@link BoxPayload}. */
export type BoxFrame = BoxPayload;

/**
 * Discrete bin identity per post-stat row (owned by bin/count + rect slots).
 * −1 = unbinned / out-of-range. Separate from rendered `xNumeric`/`yNumeric`
 * centers: this is the discrete identity for count aggregation and stack /
 * fill / dodge grouping. Never serialized into the public model.
 */
export interface BinPayload {
  xId: Int32Array | null;
  yId: Int32Array | null;
}

/** Dodge position slots (owned by bar/boxplot position + rect layout). */
export interface DodgePayload {
  slot: Uint32Array;
  /** Per-row dodge slot count (per-x, ggplot2 preserve="total"). */
  slotCounts: Uint32Array;
}

/** Smooth-stat ribbon flag (owned by smooth geometry). */
export interface SmoothPayload {
  /** Layer draws an SE ribbon (ymin/ymax are the band). */
  band: boolean;
}

/**
 * Shared fields every stage may read: binding, table, positions, styles,
 * groups, and pre-finalize lineage placeholders.
 */
export interface LayerFrameCore {
  binding: LayerBinding;
  /** The (facet-panel) table this frame was computed from. */
  table: ColumnTable;
  /** Post-stat row count. */
  n: number;
  xValues: readonly CellValue[] | null;
  xNumeric: Float64Array | null;
  yValues: readonly CellValue[] | null;
  yNumeric: Float64Array | null;
  groups: readonly number[];
  /**
   * Pre-stat group id per input table row (canonical first-seen order).
   * Identity index and bin lineage reuse this instead of re-deriving.
   * Length is always `table.rowCount` (empty for annotation frames with no rows).
   */
  inputGroups: readonly number[];
  /** Source row per post-stat row (NO_ROW for synthesized rows). */
  rowIndex: Uint32Array;
  colorValues: readonly CellValue[] | null;
  fillValues: readonly CellValue[] | null;
  sizeValues: StyleValueColumn | null;
  linewidthValues: StyleValueColumn | null;
  alphaValues: StyleValueColumn | null;
  shapeValues: StyleValueColumn | null;
  linetypeValues: StyleValueColumn | null;
  labelValues: readonly CellValue[] | null;
  /** Post-position / stat bounds (bars, areas, bands, boxes, errorbars). */
  ymin: Float64Array | null;
  ymax: Float64Array | null;
  /** Bin edges (bin-stat layers; rects span them on a continuous x). */
  xmin: Float64Array | null;
  xmax: Float64Array | null;
  /** Segment end x (transformed scale-space); null when unused. */
  xend: Float64Array | null;
  /** Segment end y (transformed scale-space); null when unused. */
  yend: Float64Array | null;
  /** Raw segment end x values (discrete evidence); null when unused. */
  xendValues: readonly CellValue[] | null;
  /** Raw segment end y values (discrete evidence); null when unused. */
  yendValues: readonly CellValue[] | null;
  /** Jitter/nudge offsets (data units / band-step fractions). */
  offsetX: Float64Array | null;
  offsetY: Float64Array | null;
  /** Annotation-rule intercepts (data units). */
  xIntercepts: CellValue[];
  yIntercepts: CellValue[];
}

/**
 * Full post-stat frame: core + per-geom payloads + lineage channel.
 *
 * `inputSourceRows` starts null at frame construction and is filled by
 * {@link finalizeFrameSourceRows}. Downstream candidate construction should
 * take {@link FinalizedLayerFrame} so the null is not re-checked at every call.
 */
export interface LayerFrame extends LayerFrameCore {
  /**
   * Global source-row id per pre-stat input table row (multi-table SourceRegistry
   * ids after filter/facet remap). Length is `table.rowCount`. Set by
   * {@link finalizeFrameSourceRows} during panel assembly (#626).
   */
  inputSourceRows: number[] | null;
  /** Discrete bin ids — only bin/count/rect consumers read this. */
  bin: BinPayload | null;
  /** Dodge slots — only bar/boxplot position + layout consumers read this. */
  dodge: DodgePayload | null;
  /** Boxplot hinges/outliers — only boxplot geometry + outlier lineage. */
  box: BoxPayload | null;
  /** Smooth SE band flag — only smooth ribbon geometry. */
  smooth: SmoothPayload | null;
}

/**
 * Frame after {@link finalizeFrameSourceRows}: lineage is present.
 * Candidate-construction and other post-assembly readers use this type so the
 * type system replaces the pre-finalize runtime throw at the call site.
 */
export type FinalizedLayerFrame = Omit<LayerFrame, "inputSourceRows"> & {
  inputSourceRows: number[];
};
