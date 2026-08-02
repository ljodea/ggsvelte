/**
 * Granular registration: stat "connect" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildConnectFrame } from "./frame-stats-connect.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerConnect(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("connect", (binding, table, groups, warnings) =>
    buildConnectFrame(binding, table, groups, warnings),
  );
}
