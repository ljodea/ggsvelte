/**
 * Granular registration (#1420): geom bin_2d + stat bin_2d. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { edgeRectsBatch } from "./geometry-edge-rects.js";
import { buildBin2dFrame } from "./frame-stats-bin-2d.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerBin2d(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("bin_2d", (frame, fx, color, fill, styles, warnings) =>
    single(edgeRectsBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerStatFrame("bin_2d", (binding, table, groups, warnings, advisories) =>
    buildBin2dFrame(binding, table, groups, warnings, advisories),
  );
}
