/**
 * Collect finite point positions (normalized) before pixel packing.
 */
import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";

export interface CollectedPointPositions {
  xs: Float64Array;
  ys: Float64Array;
  keptRows: Uint32Array;
  kept: number;
}

export function collectPointPositions(frame: LayerFrame, fx: Frame): CollectedPointPositions {
  const { n } = frame;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const keptRows = new Uint32Array(n);
  let kept = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row, frame.offsetX);
    const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row, frame.offsetY);
    if (Number.isNaN(tx) || Number.isNaN(ty)) continue;
    xs[kept] = tx;
    ys[kept] = ty;
    keptRows[kept] = row;
    kept++;
  }
  return { xs, ys, keptRows, kept };
}

export function packPointPixels(
  collected: CollectedPointPositions,
  frame: LayerFrame,
  fx: Frame,
): { positions: Float32Array; rowIndex: Uint32Array } {
  const { xs, ys, keptRows, kept } = collected;
  const positions = new Float32Array(kept * 2);
  const rowIndex = new Uint32Array(kept);
  for (let j = 0; j < kept; j++) {
    positions[j * 2] = xs[j]! * fx.innerWidth;
    positions[j * 2 + 1] = fx.innerHeight - ys[j]! * fx.innerHeight;
    rowIndex[j] = frame.rowIndex[keptRows[j]!]!;
  }
  return { positions, rowIndex };
}

export interface PackedPointPositions {
  positions: Float32Array;
  rowIndex: Uint32Array;
  keptRows: Uint32Array;
  kept: number;
}

/**
 * Continuous scatter: one normalize+pixel pass (no intermediate xs/ys
 * buffers). Returns null when band scales or positional offsets require
 * {@link collectPointPositions} + {@link packPointPixels}.
 */
export function packContinuousPointsOnePass(
  frame: LayerFrame,
  fx: Frame,
): PackedPointPositions | null {
  if (fx.xScale.type === "band" || fx.yScale.type === "band") return null;
  if (frame.offsetX !== null || frame.offsetY !== null) return null;
  const xNum = frame.xNumeric;
  const yNum = frame.yNumeric;
  if (xNum === null || yNum === null) return null;

  const { n } = frame;
  const xScale = fx.xScale;
  const yScale = fx.yScale;
  const iw = fx.innerWidth;
  const ih = fx.innerHeight;
  const sourceRows = frame.rowIndex;
  const positions = new Float32Array(n * 2);
  const rowIndex = new Uint32Array(n);
  const keptRows = new Uint32Array(n);
  let kept = 0;
  for (let row = 0; row < n; row++) {
    const xv = xNum[row]!;
    const yv = yNum[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
    const tx = xScale.normalizeTransformed(xv);
    const ty = yScale.normalizeTransformed(yv);
    if (Number.isNaN(tx) || Number.isNaN(ty)) continue;
    positions[kept * 2] = tx * iw;
    positions[kept * 2 + 1] = ih - ty * ih;
    rowIndex[kept] = sourceRows[row]!;
    keptRows[kept] = row;
    kept++;
  }
  return { positions, rowIndex, keptRows, kept };
}
