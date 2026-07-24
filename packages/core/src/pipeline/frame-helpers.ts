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
  | "bin"
  | "dodge"
  | "box"
  | "smooth"
  | "ymin"
  | "ymax"
  | "xmin"
  | "xmax"
  | "xend"
  | "yend"
  | "xendValues"
  | "yendValues"
  | "offsetX"
  | "offsetY"
  | "xIntercepts"
  | "yIntercepts"
> {
  return {
    bin: null,
    dodge: null,
    box: null,
    smooth: null,
    ymin: null,
    ymax: null,
    xmin: null,
    xmax: null,
    xend: null,
    yend: null,
    xendValues: null,
    yendValues: null,
    offsetX: null,
    offsetY: null,
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
