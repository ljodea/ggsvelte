/**
 * Granular registration (#1420): geom violin + stat ydensity. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { violinBatch } from "./geometry-violin.js";
import { buildYDensityFrame } from "./frame-stats-ydensity.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerViolin(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("violin", (frame, fx, color, fill, styles, warnings) =>
    single(violinBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerStatFrame("ydensity", (binding, table, groups, warnings) =>
    buildYDensityFrame(binding, table, groups, warnings),
  );
}
