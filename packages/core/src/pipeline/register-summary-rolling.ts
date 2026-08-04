/**
 * Granular registration: stat "summary_rolling". Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildSummaryRollingFrame } from "./frame-stats-summary-rolling.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSummaryRolling(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("summary_rolling", (binding, table, groups, warnings, advisories) =>
    buildSummaryRollingFrame(binding, table, groups, warnings, advisories),
  );
}
