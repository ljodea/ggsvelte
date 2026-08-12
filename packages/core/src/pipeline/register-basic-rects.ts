import type { GeometryBatch } from "../scene.js";

import { registerGeomBatch } from "./geometry-registry.js";
import { edgeRectsBatch } from "./geometry-edge-rects.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Register edge-defined rect geometry and blank layers. Idempotent. */
export function registerBasicRects(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("rect", (frame, fx, color, fill, styles, warnings) =>
    single(edgeRectsBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerGeomBatch("blank", () => []);
}
