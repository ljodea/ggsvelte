/**
 * Shared frame-building helpers: empty extras, intercept lists, grouping,
 * carried columns, and stat drop warnings. Group/carried live in
 * frame-group-columns; this file re-exports them for import-path stability.
 */
import type { CellValue } from "../table.js";

import type { LayerFrame, PipelineWarning } from "./types.js";

export { carriedColumns, deriveLayerGroups } from "./frame-group-columns.js";

/** Fresh all-null frame extras (each stat branch fills what it uses). */
export function emptyFrameExtras(): Pick<
  LayerFrame,
  | "xBinId"
  | "yBinId"
  | "ymin"
  | "ymax"
  | "xmin"
  | "xmax"
  | "xend"
  | "yend"
  | "xendValues"
  | "yendValues"
  | "dodgeSlot"
  | "dodgeSlotCounts"
  | "offsetX"
  | "offsetY"
  | "box"
  | "smoothBand"
  | "xIntercepts"
  | "yIntercepts"
> {
  return {
    xBinId: null,
    yBinId: null,
    ymin: null,
    ymax: null,
    xmin: null,
    xmax: null,
    xend: null,
    yend: null,
    xendValues: null,
    yendValues: null,
    dodgeSlot: null,
    dodgeSlotCounts: null,
    offsetX: null,
    offsetY: null,
    box: null,
    smoothBand: false,
    xIntercepts: [],
    yIntercepts: [],
  };
}

export function interceptList(value: unknown): CellValue[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as CellValue[];
  return [value as CellValue];
}

export function removedStatWarning(
  dropped: number,
  index: number,
  what: string,
  warnings: PipelineWarning[],
): void {
  if (dropped > 0) {
    warnings.push({
      code: "removed-missing",
      message: `Removed ${dropped} row(s) with ${what} (layer ${index}).`,
    });
  }
}
