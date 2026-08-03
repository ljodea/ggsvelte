/**
 * Side-effect module: wire candidate-store construction into the pipeline.
 * Imported by the full `@ggsvelte/core` barrel (and the test preload) so
 * `RenderModel.candidates` resolves; the lean `@ggsvelte/core/render` entry
 * omits it and never carries the candidate-store graph (#1421).
 */
import { installCandidateRuntime, getCandidateRuntime } from "./candidate-runtime.js";
import { buildPipelineCandidates } from "./pipeline/build-candidates.js";

let installed = false;

export function installCandidates(): void {
  // Re-install after test-only runtime clears; skip when already wired.
  if (installed && getCandidateRuntime() !== null) return;
  installed = true;
  installCandidateRuntime({ build: (input) => buildPipelineCandidates(input) });
}

installCandidates();
