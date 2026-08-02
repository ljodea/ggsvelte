/**
 * Granular registration (#1420): geom raster. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { rasterRectsBatch } from "./geometry-edge-rects.js";
import { registerGeomBatch } from "./geometry-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerRaster(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("raster", (frame, fx, _color, fill, styles, warnings) =>
    single(rasterRectsBatch(frame, fx, fill, styles, warnings)),
  );
}
