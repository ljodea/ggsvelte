/**
 * Accumulate per-row boxplot body geometry into layout buffers.
 */
import type { BoxplotRowGeometry } from "./geometry-boxplot-body-row.js";

export interface BoxplotBodyBuffers {
  centerPx: number[];
  halfPx: number[];
  rects: number[];
  rectRows: number[];
  keptRows: number[];
  whiskers: number[];
  whiskerRows: number[];
  medians: number[];
  medianRows: number[];
  removed: number;
}

export function createBoxplotBodyBuffers(): BoxplotBodyBuffers {
  return {
    centerPx: [],
    halfPx: [],
    rects: [],
    rectRows: [],
    keptRows: [],
    whiskers: [],
    whiskerRows: [],
    medians: [],
    medianRows: [],
    removed: 0,
  };
}

export function pushRemovedBoxplotRow(buffers: BoxplotBodyBuffers): void {
  buffers.removed++;
  buffers.centerPx.push(NaN);
  buffers.halfPx.push(NaN);
}

export function pushKeptBoxplotRow(
  buffers: BoxplotBodyBuffers,
  geom: BoxplotRowGeometry,
  row: number,
): void {
  buffers.centerPx.push(geom.centerPx);
  buffers.halfPx.push(geom.halfPx);
  buffers.rects.push(...geom.rect);
  buffers.rectRows.push(geom.sourceRow);
  buffers.keptRows.push(row);
  buffers.whiskers.push(...geom.whiskers);
  buffers.whiskerRows.push(geom.sourceRow, geom.sourceRow);
  buffers.medians.push(...geom.median);
  buffers.medianRows.push(geom.sourceRow);
}
