/**
 * Granular registration: stat "summary_bin" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildSummaryBinFrame } from "./frame-stats-summary-bin.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerSummaryBin(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("summary_bin", (binding, table, groups, warnings, advisories, binRange) =>
    buildSummaryBinFrame(binding, table, groups, warnings, advisories, binRange),
  );
}
