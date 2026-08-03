/**
 * Granular registration (#1420): geom map. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { polygonBatch } from "./geometry-paths-polygon.js";
import { registerGeomBatch } from "./geometry-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerMap(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("map", (frame, fx, color, fill, styles, warnings) =>
    single(polygonBatch(frame, fx, color, fill, styles, warnings)),
  );
}
