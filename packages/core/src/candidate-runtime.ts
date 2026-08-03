/**
 * Optional candidate-build runtime hook.
 *
 * The lean `@ggsvelte/core/render` entry leaves this unset so headless/SSR
 * bundles never carry the candidate-store graph (build-candidates →
 * candidate-store → hit geometry/spatial indexes). The full package barrel
 * installs it via `install-candidates.ts` (mirrors `temporal-runtime.ts` +
 * `install-temporal.ts`).
 *
 * `RenderModel.candidates` / `RenderModel.lineage` build lazily through this
 * hook on first access; a pipeline run that only renders never pays the
 * candidate-build cost.
 */
import type { CandidateStore } from "./candidate-store.js";
import type { LineageStore } from "./identity.js";
import type { buildPipelineCandidates } from "./pipeline/build-candidates.js";

/** Inputs finalize retains for the lazy candidate build (type-only import —
 * this module stays in the lean render graph, build-candidates does not). */
export type CandidateBuildInput = Parameters<typeof buildPipelineCandidates>[0];

export interface CandidateBuildRuntime {
  readonly build: (input: CandidateBuildInput) => CandidateStore;
}

/**
 * Finalize's lazy interaction bundle: the lineage store is created eagerly
 * (cheap, empty) but populated only by `ensure()`, so every accessor must go
 * through `ensure()` first — a bare read of the store would be silently stale.
 */
export interface LazyInteraction {
  readonly lineageStore: LineageStore<number>;
  /** Build (once) and return the candidate store; populates `lineageStore`. */
  readonly ensure: () => CandidateStore;
  /** The built store, or null when interaction was never accessed. */
  readonly built: () => CandidateStore | null;
}

let runtime: CandidateBuildRuntime | null = null;

/** Install candidate construction (full entry). Idempotent; may replace. */
export function installCandidateRuntime(next: CandidateBuildRuntime): void {
  runtime = next;
}

export function getCandidateRuntime(): CandidateBuildRuntime | null {
  return runtime;
}

/**
 * Test-only: clear the runtime so the lean render path is exercised.
 * Restore with `installCandidates()` (bunfig preload shares module state
 * across test files).
 */
export function resetCandidateRuntimeForTests(): void {
  runtime = null;
}
