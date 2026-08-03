/**
 * Granular registration: stat "density" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildDensityFrame } from "./frame-stats-density.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerDensity(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("density", (binding, table, groups, warnings) =>
    buildDensityFrame(binding, table, groups, warnings),
  );
}
