/**
 * Source-row lineage: owns conversion from panel-local rows to finalized
 * global SourceRegistry ids (#626).
 *
 * Namespaces:
 * - **filtered-local** — index into a layer table after row filters
 * - **panel-local** — index into a facet-panel slice of that table
 * - **source-local** — index into one physical source table (per sourceId)
 * - **global** — contiguous multi-table id from {@link SourceRegistry}
 *
 * After {@link finalizeFrameSourceRows}, downstream modules consume only
 * global ids via {@link globalSourceRowForInputRow} and finalized mark rows.
 * The return type {@link FinalizedLayerFrame} is the type-level seam that
 * replaces a null-check throw on every candidate-construction call.
 */
import type { FinalizedLayerFrame, LayerFrame } from "./types-layer-frame.js";
import { NO_ROW } from "./types-no-row.js";

export class SourceRowLineageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceRowLineageError";
  }
}

/** Panel-local row → global source-row id map produced during facet slicing. */
export interface PanelSourceRowMap {
  readonly globalSourceRows: readonly number[];
}

/** Remap panel-local indices in place through a finalized global map. */
function remapPanelLocalIndicesToGlobal(
  rowIndex: Uint32Array,
  globalSourceRows: readonly number[],
): void {
  for (let i = 0; i < rowIndex.length; i++) {
    const local = rowIndex[i]!;
    if (local === NO_ROW) continue;
    const global = globalSourceRows[local];
    rowIndex[i] = global ?? NO_ROW;
  }
}

/**
 * Attach finalized global source-row ids to a frame after panel slice.
 * Post-stat mark rows and boxplot outliers are remapped in place.
 * Returns the same frame narrowed to {@link FinalizedLayerFrame}.
 */
export function finalizeFrameSourceRows(
  frame: LayerFrame,
  map: PanelSourceRowMap,
): FinalizedLayerFrame {
  frame.inputSourceRows = [...map.globalSourceRows];
  remapPanelLocalIndicesToGlobal(frame.rowIndex, map.globalSourceRows);
  if (frame.box !== null) {
    remapPanelLocalIndicesToGlobal(frame.box.outlierRow, map.globalSourceRows);
  }
  return frame as FinalizedLayerFrame;
}

/** Global source-row id for one pre-stat panel-local input row. */
export function globalSourceRowForInputRow(
  frame: FinalizedLayerFrame,
  panelLocalRow: number,
): number {
  const global = frame.inputSourceRows[panelLocalRow];
  if (global === undefined) {
    throw new SourceRowLineageError(
      `Panel-local row ${panelLocalRow} is out of range for finalized inputSourceRows (length ${frame.inputSourceRows.length})`,
    );
  }
  return global;
}
