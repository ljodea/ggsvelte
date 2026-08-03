/**
 * Granular registration (#1420): geom crossbar. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import { crossbarBatches } from "./geometry-range.js";
import { registerGeomBatch } from "./geometry-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerCrossbar(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("crossbar", (frame, fx, color, fill, styles, warnings) =>
    crossbarBatches(frame, fx, color, fill, styles, warnings),
  );
}
