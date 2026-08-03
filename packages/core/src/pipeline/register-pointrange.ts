/**
 * Granular registration (#1420): geom pointrange. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import { pointrangeBatches } from "./geometry-range.js";
import { registerGeomBatch } from "./geometry-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerPointrange(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("pointrange", (frame, fx, color, _fill, styles, warnings) =>
    pointrangeBatches(frame, fx, color, styles, warnings),
  );
}
