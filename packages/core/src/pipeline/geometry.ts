/**
 * Geometry batch builders: map post-stat LayerFrames + trained scales into
 * typed-array Scene batches. Dispatch + coord flip + mark counting live here;
 * per-geom builders live in geometry-marks / geometry-composites.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  areaBatch,
  glyphsBatch,
  lineBatch,
  pointsBatch,
  rectsBatch,
  segmentsBatch,
} from "./geometry-marks.js";
import { boxplotBatches, errorbarBatch, smoothBatches } from "./geometry-composites.js";

export type { Frame } from "./geometry-shared.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

export function buildBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  switch (frame.binding.layer.geom) {
    case "point":
      return single(pointsBatch(frame, fx, color, warnings));
    case "line":
      return single(lineBatch(frame, fx, color, warnings));
    case "col":
    case "bar":
      return single(rectsBatch(frame, fx, fill, warnings));
    case "area":
    case "density":
      return single(areaBatch(frame, fx, fill, warnings));
    case "rule":
      return single(segmentsBatch(frame, fx, color, warnings));
    case "text":
      return single(glyphsBatch(frame, fx, color, warnings));
    case "smooth":
      return smoothBatches(frame, fx, color, fill, warnings);
    case "boxplot":
      return boxplotBatches(frame, fx, fill, warnings);
    case "errorbar":
      return single(errorbarBatch(frame, fx, color, warnings));
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// coord flip (the single orientation mechanism)
// ---------------------------------------------------------------------------

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
