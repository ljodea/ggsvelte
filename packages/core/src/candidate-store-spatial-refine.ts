/**
 * Per-id geometry refine for candidate hit testing (distance + rect intersect).
 * Dispatches through the mark hit-geometry table.
 */
import { createHitGeometry } from "./candidate-hit-geometry.js";
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";

export type SpatialRefine = {
  exactDistance(
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null;
  intersects(id: number, loX: number, loY: number, hiX: number, hiY: number): boolean;
};

/** Build exactDistance / intersects closed over store indexes. */
export function createSpatialRefine(indexes: CandidateStoreIndexes): SpatialRefine {
  const hit = createHitGeometry(indexes);
  return {
    exactDistance: (id, px, py, pathContainment) => hit.distance(id, px, py, pathContainment),
    intersects: (id, loX, loY, hiX, hiY) => hit.intersects(id, loX, loY, hiX, hiY),
  };
}
