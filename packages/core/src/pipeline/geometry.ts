/**
 * Geometry batch builders: map post-stat LayerFrames + trained scales into
 * typed-array Scene batches. Dispatch + coord flip + mark counting live here;
 * per-geom builders live in geometry-marks / geometry-composites.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { dispatchGeometryBatch } from "./geometry-dispatch.js";

export type { Frame } from "./geometry-shared.js";
export { flipBatchInPlace } from "./geometry-flip.js";
export { batchMarkCount } from "./geometry-mark-count.js";

export function buildBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  return dispatchGeometryBatch(frame, fx, color, fill, warnings);
}
