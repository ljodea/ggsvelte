/**
 * Mark counts per geometry batch (backend auto threshold, a11y hints).
 */
import type { GeometryBatch } from "../scene.js";

/** Marks in one batch (points/glyphs per row, paths per subpath, ...). */
export function batchMarkCount(batch: GeometryBatch): number {
  switch (batch.kind) {
    case "points":
    case "glyphs":
      return batch.rowIndex.length;
    case "paths":
      return Math.max(0, batch.pathOffsets.length - 1);
    case "rects":
      return batch.rects.length / 4;
    default:
      return batch.segments.length / 4;
  }
}
