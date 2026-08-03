/**
 * Side-effect module: wire candidate-store construction into the pipeline.
 * Imported by the full `@ggsvelte/core` barrel (and the test preload) so
 * `RenderModel.candidates` resolves; the lean `@ggsvelte/core/render` entry
 * omits it and never carries the candidate-store graph (#1421).
 */
import { installCandidateRuntime, getCandidateRuntime } from "./candidate-runtime.js";
import type { CandidateBuildRuntime } from "./candidate-runtime.js";
import { buildPipelineCandidates } from "./pipeline/build-candidates.js";

const REAL_RUNTIME: CandidateBuildRuntime = {
  build: (input) => buildPipelineCandidates(input),
};

/**
 * Install the real candidate-build runtime. Idempotent, and restores the real
 * runtime after a test-only clear OR replacement (a counting wrapper that
 * delegates must not survive its test's restore).
 */
export function installCandidates(): void {
  if (getCandidateRuntime() === REAL_RUNTIME) return;
  installCandidateRuntime(REAL_RUNTIME);
}

installCandidates();
