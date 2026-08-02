/**
 * Granular registration (#1420): geom density_2d_filled + stat density_2d_filled. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { polygonBatch } from "./geometry-paths-polygon.js";
import { buildDensity2dFrame } from "./frame-stats-density-2d.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerDensity2dFilled(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("density_2d_filled", (frame, fx, color, fill, styles, warnings) =>
    single(polygonBatch(frame, fx, color, fill, styles, warnings)),
  );
  registerStatFrame("density_2d_filled", (binding, table, groups, warnings) =>
    buildDensity2dFrame(binding, table, groups, warnings),
  );
}
