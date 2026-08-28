/**
 * CI path routing — classify changed paths into lanes and map lanes to the
 * jobs that should run. Pure functions; no content-hash / cache logic here.
 *
 * Design notes:
 * - Prefer pure functions over third-party path-filter actions so filters are
 *   tested in-repo and SHA-pinned action surface stays small.
 * - `forceAll` is the safe fallback when git cannot compute a base (missing
 *   event.before, shallow history, etc.).
 * - Product force (lockfile / ci-routing) schedules browser + package surfaces.
 *   CI plumbing (`ci.yml` pin bumps, composite actions under `.github/actions`)
 *   does **not** product-force: Dependabot deps-ci PRs must not drag VR /
 *   Playwright / packed-consumer. Recipe identity still bypasses content-hash
 *   caches (see content-hash.ts) so the next product PR re-executes under the
 *   new workflow/action pins.
 * - The `ci_routing` lane includes `scripts/ci-routing.ts` and
 *   `scripts/ci-routing/**` so router edits still force the full surface.
 *
 * Re-export facade. Implementation modules:
 * - `types.ts` — lane/job type vocabulary
 * - `patterns.ts` — DOCS_CONTENT_* + LANE_PATTERNS tables
 * - `match.ts` — glob-lite path pattern matcher
 * - `docs-membership.ts` — content-only membership + docs `$scripts` parsing
 * - `plan.ts` — classifyChangedPaths, planJobs, gate, GitHub outputs
 * - `git-paths.ts` — git list-text parsing
 */

export type { ChangeLane, ChangeFlags, JobName, JobPlan, JobResult } from "./types";
export { DOCS_CONTENT_ONLY_PATHS, DOCS_CONTENT_SCRIPT_PATTERNS, LANE_PATTERNS } from "./patterns";
export { matchPathPattern } from "./match";
export {
  docsPackageInvokedScripts,
  docsSourceScriptImports,
  isDocsContentOnlyPath,
  isDocsRenderPath,
} from "./docs-membership";
export type { FormatGithubOutputOptions, GateEvaluation, PlanOptions } from "./plan";
export {
  classifyChangedPaths,
  emptyChangeFlags,
  evaluateGate,
  formatGithubOutputs,
  jobNames,
  normalizeJobResult,
  planJobs,
} from "./plan";
export { parseFileList, parseNameStatusList } from "./git-paths";
