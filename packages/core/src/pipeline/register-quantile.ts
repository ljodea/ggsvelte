/**
 * Granular registration (#1420): geom quantile + stat quantile. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { lineBatch } from "./geometry-paths-line.js";
import { buildQuantileFrame } from "./frame-stats-quantile.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerQuantile(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("quantile", (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings)),
  );
  registerStatFrame("quantile", (binding, table, groups, warnings) =>
    buildQuantileFrame(binding, table, groups, warnings),
  );
}
