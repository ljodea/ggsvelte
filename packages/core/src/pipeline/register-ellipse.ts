/**
 * Granular registration: stat "ellipse" (#1420). Imported by the matching
 * <Geom*> shell or by spec-driven apps opting into this stat without
 * registerAll(). Composed by frame-stats-register-all.ts.
 *
 * @lifecycle experimental
 */
import { buildEllipseFrame } from "./frame-stats-ellipse.js";
import { registerStatFrame } from "./frame-stats-registry.js";

let registered = false;

/** Idempotent: safe to call more than once. */
export function registerEllipse(): void {
  if (registered) return;
  registered = true;
  registerStatFrame("ellipse", (binding, table, groups, warnings) =>
    buildEllipseFrame(binding, table, groups, warnings),
  );
}
