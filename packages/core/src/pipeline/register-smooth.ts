/**
 * Granular registration (#1420): geom smooth + stat smooth. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import { smoothBatches } from "./geometry-smooth.js";
import { buildSmoothFrame } from "./frame-stats-smooth.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSmooth(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("smooth", (frame, fx, color, fill, styles, warnings) =>
    smoothBatches(frame, fx, color, fill, styles, warnings),
  );
  registerStatFrame("smooth", (binding, table, groups, warnings, advisories) =>
    buildSmoothFrame(binding, table, groups, warnings, advisories),
  );
}
