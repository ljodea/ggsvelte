/**
 * CI path routing + content-hash skip — public entrypoint and CLI.
 *
 * Implementation is split for maintainability:
 * - `scripts/ci-routing/routing.ts` — path lanes, job planning, gate, outputs
 * - `scripts/ci-routing/content-hash-types.ts` — schema, execution keys, shards
 * - `scripts/ci-routing/content-hash-inputs.ts` — JOB_CONTENT_INPUTS tables
 * - `scripts/ci-routing/content-hash-markers.ts` — success markers
 * - `scripts/ci-routing/content-hash.ts` — hash, cache keys, git digests
 * - `scripts/ci-routing/cli.ts` — argv commands (not re-exported)
 *
 * Workflows and composite actions continue to run:
 *   bun scripts/ci-routing.ts <command> …
 * and import pure helpers from this module.
 */

export type {
  ChangeLane,
  ChangeFlags,
  JobName,
  JobPlan,
  JobResult,
  PlanOptions,
  GateEvaluation,
  FormatGithubOutputOptions,
} from "./ci-routing/routing";
export {
  LANE_PATTERNS,
  DOCS_CONTENT_ONLY_PATHS,
  DOCS_CONTENT_SCRIPT_PATTERNS,
  emptyChangeFlags,
  matchPathPattern,
  classifyChangedPaths,
  isDocsContentOnlyPath,
  isDocsRenderPath,
  docsPackageInvokedScripts,
  docsSourceScriptImports,
  planJobs,
  evaluateGate,
  formatGithubOutputs,
  normalizeJobResult,
  parseFileList,
  parseNameStatusList,
  jobNames,
} from "./ci-routing/routing";

export type { CacheableExecution } from "./ci-routing/content-hash-types";
export { CONTENT_HASH_SCHEMA, CACHEABLE_EXECUTIONS } from "./ci-routing/content-hash-types";
export { JOB_CONTENT_INPUTS, listJobContentPaths } from "./ci-routing/content-hash-inputs";
export type { SuccessMarker } from "./ci-routing/content-hash-markers";
export {
  serializeSuccessMarker,
  parseSuccessMarker,
  validateSuccessMarker,
  successMarkerPath,
} from "./ci-routing/content-hash-markers";
export type { HashJobInputsOptions, ContentHashCacheKeyInput } from "./ci-routing/content-hash";
export {
  hashJobInputs,
  requireJobInputDigests,
  shouldBypassContentCache,
  contentHashCacheKey,
  parseGitLsTreeLine,
  formatTreeEntryDigest,
  collectGitHeadInputDigests,
} from "./ci-routing/content-hash";

import { runCiRoutingCli } from "./ci-routing/cli";

if (import.meta.main) {
  try {
    await runCiRoutingCli(process.argv);
  } catch (err: unknown) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
