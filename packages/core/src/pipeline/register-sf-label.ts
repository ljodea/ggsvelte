/**
 * Granular registration (#1420): geom sf_label + stat sf_coordinates. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { glyphsBatch } from "./geometry-glyphs.js";
import { buildSfCoordinatesFrame } from "./frame-stats-sf-coordinates.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSfLabel(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("sf_label", (frame, fx, color, fill, styles, warnings) =>
    single(glyphsBatch(frame, fx, color, fill, styles, warnings)),
  );
  registerStatFrame("sf_coordinates", (binding, table, groups, warnings) =>
    buildSfCoordinatesFrame(binding, table, groups, warnings),
  );
}
