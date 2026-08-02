/**
 * Granular registration (#1420): geom function + stat function. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { lineBatch } from "./geometry-paths-line.js";
import { buildFunctionFrame } from "./frame-stats-function.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerFunction(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("function", (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings)),
  );
  registerStatFrame("function", (binding, table, _groups, warnings, _adv, _bin, functionDomain) =>
    buildFunctionFrame(binding, table, warnings, functionDomain),
  );
}
