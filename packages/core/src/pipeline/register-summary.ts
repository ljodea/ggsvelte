/**
 * Granular registration: stat "summary" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildSummaryFrame } from "./frame-stats-summary.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSummary(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("summary", (binding, table, groups, warnings) =>
    buildSummaryFrame(binding, table, groups, warnings),
  );
}
