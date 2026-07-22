/**
 * Mark counts per geometry batch (backend auto threshold, a11y hints).
 * Single definition: {@link renderPrimitiveCount}.
 */
import { renderPrimitiveCount } from "../candidate-geometry.js";
import type { GeometryBatch } from "../scene.js";

/** Marks in one batch (points/glyphs per row, paths per subpath, ...). */
export function batchMarkCount(batch: GeometryBatch): number {
  return renderPrimitiveCount(batch);
}
