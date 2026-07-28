/**
 * Geometry batch builders: map post-stat LayerFrames + trained scales into
 * typed-array Scene batches. Dispatch + coord flip + mark counting live here;
 * per-geom builders live in geometry-marks / geometry-composites.
 */
export type { Frame } from "./geometry-shared.js";
export { flipBatchInPlace } from "./geometry-flip.js";
/** Public alias for {@link renderPrimitiveCount} (package export name). */
export { renderPrimitiveCount as batchMarkCount } from "../candidate-geometry.js";
/** Scene-batch dispatch entry used by assemble-geometry-batches. */
export { dispatchGeometryBatch as buildBatch } from "./geometry-dispatch.js";
