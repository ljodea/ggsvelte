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
export { flipBatchInPlace } from "./geometry-flip.js";
export { batchMarkCount } from "./geometry-mark-count.js";

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
