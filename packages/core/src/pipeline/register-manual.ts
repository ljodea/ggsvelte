/**
 * Granular registration: stat "manual" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildManualFrame } from "./frame-stats-manual.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerManual(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("manual", (binding, table, groups, warnings) =>
    buildManualFrame(binding, table, groups, warnings),
  );
}
