/**
 * Granular registration: stat "ecdf" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildEcdfFrame } from "./frame-stats-ecdf.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerEcdf(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("ecdf", (binding, table, groups, warnings) =>
    buildEcdfFrame(binding, table, groups, warnings),
  );
}
