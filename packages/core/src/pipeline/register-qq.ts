/**
 * Granular registration (#1420): geom qq + stat qq. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { pointsBatch } from "./geometry-points.js";
import { buildQqFrame } from "./frame-stats-qq.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerQq(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("qq", (frame, fx, color, _fill, styles, warnings) =>
    single(pointsBatch(frame, fx, color, styles, warnings)),
  );
  registerStatFrame("qq", (binding, table, groups, warnings) =>
    buildQqFrame(binding, table, groups, warnings),
  );
}
