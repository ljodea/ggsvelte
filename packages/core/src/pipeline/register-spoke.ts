/**
 * Granular registration (#1420): geom spoke. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { finiteSegmentBatch } from "./geometry-segment-finite.js";
import { registerGeomBatch } from "./geometry-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSpoke(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("spoke", (frame, fx, color, _fill, styles, warnings) =>
    single(finiteSegmentBatch(frame, fx, color, styles, warnings)),
  );
}
