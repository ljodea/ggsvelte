/**
 * Granular registration: stat "unique" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildUniqueFrame } from "./frame-stats-unique.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerUnique(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("unique", (binding, table, groups) => buildUniqueFrame(binding, table, groups));
}
