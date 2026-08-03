/**
 * Granular registration (#1420): geom linerange. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { linerangeBatch } from "./geometry-range.js";
import { registerGeomBatch } from "./geometry-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerLinerange(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("linerange", (frame, fx, color, _fill, styles, warnings) =>
    single(linerangeBatch(frame, fx, color, styles, warnings)),
  );
}
