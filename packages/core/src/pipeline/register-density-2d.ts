/**
 * Granular registration (#1420): geom density_2d + stat density_2d. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { lineBatch } from "./geometry-paths-line.js";
import { buildDensity2dFrame } from "./frame-stats-density-2d.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerDensity2d(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("density_2d", (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false })),
  );
  registerStatFrame("density_2d", (binding, table, groups, warnings) =>
    buildDensity2dFrame(binding, table, groups, warnings),
  );
}
