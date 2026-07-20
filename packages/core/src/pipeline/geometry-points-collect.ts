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
