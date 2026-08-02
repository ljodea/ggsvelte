/**
 * Granular registration (#1420): geom hex + stat bin_hex. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import type { GeometryBatch } from "../scene.js";
import { hexBatch } from "./geometry-hex.js";
import { buildBinHexFrame } from "./frame-stats-bin-hex.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerHex(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("hex", (frame, fx, color, fill, styles, warnings) =>
    single(hexBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerStatFrame("bin_hex", (binding, table, groups, warnings, advisories) =>
    buildBinHexFrame(binding, table, groups, warnings, advisories),
  );
}
