/**
 * Post-stat LayerFrame: panel-local geometry inputs after bind + stat + position.
 */
import type { CellValue, ColumnTable } from "../table.js";

import type { LayerBinding } from "./types-binding.js";

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
  yValues: readonly CellValue[] | null;
  yNumeric: Float64Array | null;
  /**
   * type: "binned" only — the stable integer bin id per post-stat row (−1 =
   * unbinned/out-of-range). Separate from the rendered `xNumeric`/`yNumeric`
   * transformed centers: this is the discrete identity for count aggregation
   * and stack/fill/dodge grouping. Never serialized into the public model.
   */
  xBinId: Int32Array | null;
  yBinId: Int32Array | null;
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
