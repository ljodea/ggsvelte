/**
 * Coord-flip in-place vertex transform (the single orientation mechanism).
 */
import type { GeometryBatch } from "../scene.js";

/**
 * Flip one batch in place. Geometry was computed against the UNFLIPPED frame
 * with swapped extents (innerWidth = panel height, innerHeight = panel
 * width); each vertex then maps (x, y) -> (W - y, H - x), which renders the
 * x channel vertically (first band at the bottom, like ggplot2's coord_flip)
 * and the y channel horizontally (increasing right).
 */
export function flipBatchInPlace(batch: GeometryBatch, width: number, height: number): void {
  const flipPoints = (a: Float32Array) => {
    for (let i = 0; i < a.length; i += 2) {
      const x = a[i]!;
      const y = a[i + 1]!;
      a[i] = width - y;
      a[i + 1] = height - x;
    }
  };
  switch (batch.kind) {
    case "points":
    case "glyphs":
    case "paths":
      flipPoints(batch.positions);
      break;
    case "segments":
      // x1,y1,x2,y2 = two vertices; the point transform applies pairwise.
      flipPoints(batch.segments);
      break;
    case "rects": {
      const r = batch.rects;
      for (let j = 0; j < r.length; j += 4) {
        const x = r[j]!;
        const y = r[j + 1]!;
        const w = r[j + 2]!;
        const h = r[j + 3]!;
        r[j] = width - (y + h);
        r[j + 1] = height - (x + w);
        r[j + 2] = h;
        r[j + 3] = w;
      }
      break;
    }
  }
}
