/**
 * Granular registration (#1420): geom dotplot + stat bindot. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { pointsBatch } from "./geometry-points.js";
import { buildBindotFrame } from "./frame-stats-bindot.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerDotplot(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("dotplot", (frame, fx, color, fill, styles, warnings) =>
    single(pointsBatch(frame, fx, color, styles, warnings, fill)),
  );
  registerStatFrame("bindot", (binding, table, groups, warnings, advisories, binRange) =>
    buildBindotFrame(binding, table, groups, warnings, advisories, binRange),
  );
}
