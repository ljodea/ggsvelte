/**
 * CI path routing + content-hash skip — public entrypoint and CLI.
 *
 * Implementation is split for maintainability:
 * - `scripts/ci-routing/routing.ts` — path lanes, job planning, gate, outputs
 * - `scripts/ci-routing/content-hash.ts` — content-hash skip protocol
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
  planJobs,
  evaluateGate,
  formatGithubOutputs,
  normalizeJobResult,
  parseFileList,
  parseNameStatusList,
  jobNames,
} from "./ci-routing/routing";

export type {
  CacheableExecution,
  HashJobInputsOptions,
  ContentHashCacheKeyInput,
  SuccessMarker,
} from "./ci-routing/content-hash";
export {
  CONTENT_HASH_SCHEMA,
  CACHEABLE_EXECUTIONS,
  JOB_CONTENT_INPUTS,
  listJobContentPaths,
  hashJobInputs,
  requireJobInputDigests,
  shouldBypassContentCache,
  contentHashCacheKey,
  serializeSuccessMarker,
  parseSuccessMarker,
  validateSuccessMarker,
  successMarkerPath,
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
