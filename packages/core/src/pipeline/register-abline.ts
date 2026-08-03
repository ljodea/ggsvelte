/**
 * Granular registration (#1420): geom abline. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { ablineBatch } from "./geometry-abline.js";
import { registerGeomBatch } from "./geometry-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerAbline(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("abline", (frame, fx, color, _fill, styles, warnings) =>
    single(ablineBatch(frame, fx, color, styles, warnings)),
  );
}
