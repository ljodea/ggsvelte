/**
 * Browser-lane registration opt-in (#1420): spec-driven test files (layers
 * prop, direct runPipeline helpers) have no <Geom*> components to
 * self-register specialty geoms/stats, so the file imports this module —
 * mirroring how apps call registerAll() once at startup. Per-file import
 * (not a lane-wide setupFiles entry) so non-rendering suites pay nothing:
 * a global setup starved the suite-shared Vite SSR endpoint under load.
 *
 * Isolation contract: registration-per-file (vitest browser keeps per-file
 * isolate). Files proving component self-registration WITHOUT this setup
 * (Seam C) live in the SSR lane — see tests/geom-self-registration.ssr.test.ts.
 * Never point that lane at this file.
 *
 * NOTE: deliberately NOT registerAll() — installTemporal() evaluates the
 * Temporal polyfill per iframe. Temporal arrives per-file via GGPlot's
 * runtime (component tests), helpers/model.ts, or an explicit registerAll()
 * in the test file (temporal spec-driven suites). installCandidates() IS
 * called here: it is a cheap runtime thunk (no polyfill) and direct
 * runPipeline tests may touch model.candidates (#1421).
 */
import { installCandidates, registerAllGeomBatches, registerAllStatFrames } from "@ggsvelte/core";

registerAllStatFrames();
registerAllGeomBatches();
installCandidates();
