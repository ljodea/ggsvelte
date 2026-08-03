/**
 * Granular registration (#1420): geom contour + stat contour. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { lineBatch } from "./geometry-paths-line.js";
import { buildContourFrame } from "./frame-stats-contour.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerContour(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("contour", (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false })),
  );
  registerStatFrame("contour", (binding, table, groups, warnings) =>
    buildContourFrame(binding, table, groups, warnings),
  );
}
