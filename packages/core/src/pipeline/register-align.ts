/**
 * Granular registration: stat "align" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildAlignFrame } from "./frame-stats-align.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerAlign(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("align", (binding, table, groups, warnings) =>
    buildAlignFrame(binding, table, groups, warnings),
  );
}
