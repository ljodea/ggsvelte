/**
 * Granular registration: stat "bin" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildBinFrame } from "./frame-stats-bin.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerBin(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("bin", (binding, table, groups, warnings, advisories, binRange) =>
    buildBinFrame(binding, table, groups, warnings, advisories, binRange),
  );
}
