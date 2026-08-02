/**
 * Granular registration (#1420): geom sf + stat sf. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { pointsBatch } from "./geometry-points.js";
import { lineBatch } from "./geometry-paths-line.js";
import { polygonBatch } from "./geometry-paths-polygon.js";
import { buildSfFrame } from "./frame-stats-sf.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSf(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("sf", (frame, fx, color, fill, styles, warnings) => {
    const kind = frame.sf?.kind ?? "polygon";
    if (kind === "point") return single(pointsBatch(frame, fx, color, styles, warnings));
    if (kind === "line") {
      return single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
    }
    return single(polygonBatch(frame, fx, color, fill, styles, warnings));
  });
  registerStatFrame("sf", (binding, table, groups, warnings) =>
    buildSfFrame(binding, table, groups, warnings),
  );
}
