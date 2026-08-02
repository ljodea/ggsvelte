/**
 * Granular registration (#1420): geom boxplot + stat boxplot. Imported by the matching <Geom*>
 * shell or by spec-driven apps opting into this family without registerAll().
 * Composed by the register-all modules.
 *
 * @lifecycle experimental
 */
import { boxplotBatches } from "./geometry-boxplot.js";
import { buildBoxplotFrame } from "./frame-stats-boxplot.js";
import { registerGeomBatch } from "./geometry-registry.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerBoxplot(): void {
  if (registered) return;
  registered = true;
  registerGeomBatch("boxplot", (frame, fx, _color, fill, styles, warnings) =>
    boxplotBatches(frame, fx, fill, styles, warnings),
  );
  registerStatFrame("boxplot", (binding, table, groups, warnings) =>
    buildBoxplotFrame(binding, table, groups, warnings),
  );
}
