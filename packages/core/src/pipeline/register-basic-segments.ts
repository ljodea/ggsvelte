import type { GeometryBatch } from "../scene.js";

import { registerGeomBatch } from "./geometry-registry.js";
import { finiteSegmentBatch } from "./geometry-segment-finite.js";
import { segmentsBatch } from "./geometry-segments.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Register rule and finite segment geometry. Idempotent. */
export function registerBasicSegments(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("rule", (frame, fx, color, _fill, styles, warnings) =>
    single(segmentsBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("segment", (frame, fx, color, _fill, styles, warnings) =>
    single(finiteSegmentBatch(frame, fx, color, styles, warnings)),
  );
}
