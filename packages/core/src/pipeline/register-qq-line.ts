/**
 * Granular registration (#1420): geom qq_line + stat qq_line. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { lineBatch } from "./geometry-paths-line.js";
import { buildQqLineFrame } from "./frame-stats-qq.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerQqLine(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("qq_line", (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings)),
  );
  registerStatFrame("qq_line", (binding, table, groups, warnings) =>
    buildQqLineFrame(binding, table, groups, warnings),
  );
}
