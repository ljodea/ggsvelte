/**
 * CI path routing + content-hash skip — single source of truth for which
 * expensive jobs a change should schedule, and (issue #245) when a scheduled
 * job may short-circuit because its input tree already passed under the same
 * content hash.
 *
 * Design notes:
 * - Prefer pure functions over third-party path-filter actions so filters are
 *   tested in-repo and SHA-pinned action surface stays small.
 * - `forceAll` is the safe fallback when git cannot compute a base (missing
 *   event.before, shallow history, etc.).
 * - Changing `.github/workflows/ci.yml` itself forces the full CI surface so a
 *   routing edit cannot land without exercising the jobs it controls.
 *
 * Content-hash skip (issue #245):
 * - Path routing decides whether a job is *scheduled*. Content-hash decides
 *   whether a scheduled job may *early-exit success* after restoring a validated
 *   success marker / packages-dist cache for that execution identity.
 * - Hashes are fail-closed: every matched input path must have a digest; empty
 *   digest maps throw. Expanding JOB_CONTENT_INPUTS changes the patterns string
 *   inside the digest and invalidates old caches.
 * - `bypass_content_cache` is true under force-all or lockfile / ci.yml /
 *   ci-routing changes — jobs must not short-circuit when it is set.
 * - Cache identity is per *physical execution* (component shards, consumer
 *   matrix cells), not only logical routing names.
 * - Invalidation: bump CONTENT_HASH_SCHEMA, edit a matched input, change
 *   JOB_CONTENT_INPUTS patterns, or set repo variable CI_DISABLE_CONTENT_HASH=1.
 * - GHA cache is ref-scoped; reuse is best-effort for re-runs / default-branch
 *   restore, not a guaranteed cross-PR registry.
 */

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";

export type ChangeLane =
  | "spec"
  | "core"
  | "svelte"
  | "docs"
  | "examples"
  | "benchmarks"
  | "scripts"
  | "evals"
  | "workflows"
  | "ci_workflow"
  | "ci_routing"
  | "ci_actions"
  | "visual"
  | "spikes"
  | "lockfile"
  | "markdown"
  | "performance"
  | "consumer_tools";

export type ChangeFlags = Record<ChangeLane, boolean>;

export type JobName =
  | "checks"
  | "unit"
  | "component"
  | "consumer"
  | "build"
  | "actions_security"
  | "bench_smoke"
  | "interaction_perf"
  | "packages_dist"
  | "vr"
  | "pages";

export type JobPlan = Record<JobName, boolean>;

export type JobResult = "success" | "failure" | "cancelled" | "skipped" | "unknown";

/** Path patterns per change lane. `**` = this dir or any descendant. */
export const LANE_PATTERNS: Record<ChangeLane, readonly string[]> = {
  spec: ["packages/spec/**"],
  core: ["packages/core/**"],
  svelte: ["packages/svelte/**", "skills/ggsvelte/**"],
  docs: [
    "apps/docs/**",
    // Docs app imports `$scripts/gen-llms` and ships lifecycle-driven guide content.
    "scripts/gen-llms.ts",
    "scripts/gen-llms.test.ts",
    "scripts/diagnostic-docs.ts",
    "scripts/quickstart.ts",
    "lifecycle.json",
  ],
  examples: ["examples/**"],
  benchmarks: ["benchmarks/**"],
  scripts: [
    "scripts/**",
    "lifecycle.json",
    // Unit suite validates manual-AT evidence + community forms + Changesets config.
    "docs/accessibility/manual-at/**",
    ".github/ISSUE_TEMPLATE/**",
    ".github/DISCUSSION_TEMPLATE/**",
    ".changeset/**",
  ],
  evals: ["tests/evals/**"],
  workflows: [
    ".github/workflows/**",
    ".github/actionlint.yaml",
    // Only the actions-security job runs the real actionlint runner against workflows.
    "scripts/actionlint.ts",
    "scripts/actionlint.test.ts",
  ],
  ci_workflow: [".github/workflows/ci.yml"],
  ci_routing: ["scripts/ci-routing.ts", "scripts/ci-routing.test.ts"],
  // Local composite actions used by ci.yml (content-hash restore/write). A change
  // here is a CI recipe change and must force the full surface + bypass cache.
  ci_actions: [".github/actions/**"],
  visual: ["tests/visual/**"],
  performance: [
    "tests/performance/**",
    // Direct inputs to the Playwright interaction-perf job.
    "apps/docs/src/routes/__perf/**",
    "benchmarks/interaction-budgets.json",
  ],
  spikes: ["spikes/**"],
  // Packed-consumer harness (not the whole scripts/ tree — matrix is expensive).
  consumer_tools: [
    "scripts/consumer-compat.ts",
    "scripts/consumer-compat.test.ts",
    "scripts/quickstart.ts",
    "scripts/quickstart-timing.ts",
    "scripts/quickstart-timing.test.ts",
    "scripts/support-matrix.ts",
    "scripts/support-matrix.test.ts",
  ],
  lockfile: [
    "bun.lock",
    "package.json",
    "tsconfig.json",
    "tsconfig.base.json",
    "knip.jsonc",
    ".pre-commit-config.yaml",
    "bunfig.toml",
    "support-matrix.json",
    ".oxlintrc.json",
    ".oxfmtrc.json",
    ".markdownlint-cli2.jsonc",
  ],
  markdown: ["**/*.md", "**/*.mdx"],
};

const JOB_NAMES: readonly JobName[] = [
  "checks",
  "unit",
  "component",
  "consumer",
  "build",
  "actions_security",
  "bench_smoke",
  "interaction_perf",
  "packages_dist",
  "vr",
  "pages",
] as const;

const LANE_NAMES = Object.keys(LANE_PATTERNS) as ChangeLane[];

export function emptyChangeFlags(): ChangeFlags {
  const flags = {} as ChangeFlags;
  for (const lane of LANE_NAMES) flags[lane] = false;
  return flags;
}

/**
 * Glob-lite matcher used by routing (not a full minimatch port).
 * Supports:
 * - exact paths
 * - `dir/**` (directory or any descendant)
 * - single-segment `*` / trailing `*.ext` without `/` in the pattern
 * - `**\/*.md` style suffix matches (any depth)
 */
export function matchPathPattern(pattern: string, filePath: string): boolean {
  const path = filePath.replaceAll("\\", "/");
  const pat = pattern.replaceAll("\\", "/");

  if (pat.startsWith("**/")) {
    const suffix = pat.slice(3);
    if (suffix.includes("*") || suffix.includes("/")) {
      // `**/*.md` → ends with .md at any depth (single extension wildcard only)
      if (suffix.startsWith("*.") && !suffix.slice(2).includes("*") && !suffix.includes("/")) {
        return path.endsWith(suffix.slice(1)) || path.includes(`/${suffix.slice(1)}`);
      }
      return false;
    }
    return path === suffix || path.endsWith(`/${suffix}`);
  }

  if (pat.endsWith("/**")) {
    const prefix = pat.slice(0, -3);
    if (path === prefix) return true;
    return path.startsWith(`${prefix}/`);
  }

  if (pat.includes("*")) {
    if (pat.includes("/")) return false;
    const re = new RegExp(
      `^${pat
        .split("*")
        .map((part) => escapeRegExp(part))
        .join(".*")}$`,
    );
    return re.test(path) && !path.includes("/");
  }

  return path === pat;
}

function escapeRegExp(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function classifyChangedPaths(files: readonly string[]): ChangeFlags {
  const flags = emptyChangeFlags();
  for (const raw of files) {
    const file = raw.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file || file === ".") continue;
    for (const lane of LANE_NAMES) {
      if (flags[lane]) continue;
      for (const pattern of LANE_PATTERNS[lane]) {
        if (matchPathPattern(pattern, file)) {
          flags[lane] = true;
          break;
        }
      }
    }
  }
  return flags;
}

export type PlanOptions = {
  /** When true, every job is scheduled (missing base ref / rebuild-all). */
  forceAll?: boolean;
};

/**
 * Map change lanes → jobs, including monorepo dependency edges:
 * spec → core consumers; core → svelte; packages → VR/pages/build/consumer.
 *
 * Coverage edges restored after path-routing (Codex review on #242):
 * - unit also covers docs/examples/workflows/svelte (script tests live only there)
 * - consumer follows consumer harness scripts as well as packages
 * - bench_smoke follows svelte (retained-memory imports inspection)
 * - docs generators (gen-llms / lifecycle.json) sit on the docs lane → pages/vr
 */
export function planJobs(changes: ChangeFlags, options: PlanOptions = {}): JobPlan {
  if (options.forceAll === true) {
    const all = {} as JobPlan;
    for (const job of JOB_NAMES) all[job] = true;
    return all;
  }

  const force = changes.lockfile || changes.ci_workflow || changes.ci_routing || changes.ci_actions;
  const packageSurface = changes.spec || changes.core || changes.svelte || force;
  const docsSurface = changes.docs || changes.examples || force;
  const browserSurface =
    packageSurface || changes.spikes || changes.visual || changes.performance || force;
  // knip / type-aware / docs+examples check live on the build job once pre-push
  // parity is dropped from the checks job (to avoid double-running unit/build).
  const staticAnalysisSurface =
    packageSurface || docsSurface || changes.scripts || changes.evals || force;

  // Shared packages/*/dist artifact for jobs that previously each ran
  // `bun run build`. Unit/bench-smoke stay on the cheaper `bun run check`
  // (spec/core only) and do not wait on the full Svelte package build.
  const packagesDist =
    packageSurface ||
    changes.spikes ||
    changes.visual ||
    changes.performance ||
    changes.consumer_tools ||
    force;

  return {
    // Cheap format/lint parity — always on so markdown-only PRs still get oxfmt/prettier.
    checks: true,
    unit:
      changes.spec ||
      changes.core ||
      changes.svelte ||
      changes.scripts ||
      changes.benchmarks ||
      changes.evals ||
      changes.docs ||
      changes.examples ||
      changes.workflows ||
      force,
    component: browserSurface,
    consumer: packageSurface || changes.consumer_tools || force,
    build: staticAnalysisSurface,
    actions_security: changes.workflows || force,
    // retained-memory imports packages/svelte inspection coordinator.
    bench_smoke: changes.benchmarks || changes.spec || changes.core || changes.svelte || force,
    // Informational only; path-gated and independent of the component job.
    interaction_perf: browserSurface,
    packages_dist: packagesDist,
    vr: packageSurface || docsSurface || changes.visual || force,
    pages: packageSurface || docsSurface || force,
  };
}

export type GateEvaluation = {
  ok: boolean;
  failures: string[];
};

/**
 * Required-check aggregator: skipped is OK only when the job was not required.
 * A required job that is skipped signals a workflow `if:` / routing mismatch.
 */
export function evaluateGate(
  required: JobPlan,
  results: Partial<Record<JobName, string | undefined>>,
): GateEvaluation {
  const failures: string[] = [];
  for (const job of JOB_NAMES) {
    if (!required[job]) continue;
    const result = normalizeResult(results[job]);
    if (result === "success") continue;
    if (result === "skipped") {
      failures.push(job);
      continue;
    }
    // failure, cancelled, unknown
    failures.push(job);
  }
  return { ok: failures.length === 0, failures };
}

function normalizeResult(value: string | undefined): JobResult {
  if (value === "success" || value === "failure" || value === "cancelled" || value === "skipped") {
    return value;
  }
  // GitHub exposes empty string when a needed job was skipped due to an upstream skip.
  if (value === undefined || value === "") return "skipped";
  return "unknown";
}

export function formatGithubOutputs(
  plan: JobPlan,
  options: FormatGithubOutputOptions = {},
): string {
  const lines: string[] = [];
  for (const job of JOB_NAMES) {
    lines.push(`${job}=${plan[job] ? "true" : "false"}`);
  }
  if (options.bypassContentCache !== undefined) {
    lines.push(`bypass_content_cache=${options.bypassContentCache ? "true" : "false"}`);
  }
  return `${lines.join("\n")}\n`;
}

export function parseFileList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Parse `git diff --name-status` stdout into every path involved, including
 * both sides of renames/copies. `--name-only` drops the source path of a
 * rename, so a move out of `packages/svelte/**` into docs could skip package
 * jobs while the package file was effectively removed.
 */
export function parseNameStatusList(text: string): string[] {
  const paths: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trimEnd();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    // status\tpath  OR  R100\told\tnew  OR  C100\told\tnew
    const parts = trimmed.split("\t");
    if (parts.length < 2) continue;
    const status = parts[0] ?? "";
    if (status.startsWith("R") || status.startsWith("C")) {
      const from = parts[1];
      const to = parts[2];
      if (from !== undefined && from.length > 0) paths.push(from);
      if (to !== undefined && to.length > 0) paths.push(to);
      continue;
    }
    const path = parts[1];
    if (path !== undefined && path.length > 0) paths.push(path);
  }
  return [...new Set(paths)];
}

export function jobNames(): readonly JobName[] {
  return JOB_NAMES;
}

// ---------------------------------------------------------------------------
// Content-hash skip (issue #245)
// ---------------------------------------------------------------------------

/** Bump to globally invalidate all content-hash caches. */
export const CONTENT_HASH_SCHEMA = 1;

/**
 * Physical CI executions that may content-hash short-circuit.
 * Distinct from JobName: component is three shards; consumer is matrixed.
 */
export type CacheableExecution =
  | "packages_dist"
  | "unit"
  | "build"
  | "actions_security"
  | "bench_smoke"
  | "interaction_perf"
  | "component_svelte"
  | "component_spikes"
  | "component_journeys"
  | "consumer";

export const CACHEABLE_EXECUTIONS: readonly CacheableExecution[] = [
  "packages_dist",
  "unit",
  "build",
  "actions_security",
  "bench_smoke",
  "interaction_perf",
  "component_svelte",
  "component_spikes",
  "component_journeys",
  "consumer",
] as const;

/**
 * Toolchain + recipe files folded into every hashable execution so a workflow
 * or router change cannot reuse results produced under a different recipe.
 */
const UNIVERSAL_CONTENT_INPUTS: readonly string[] = [
  ".github/workflows/ci.yml",
  // Composite actions hold the success-marker protocol after extraction from ci.yml.
  ".github/actions/**",
  "scripts/ci-routing.ts",
  "scripts/ci-routing.test.ts",
  "bun.lock",
  "package.json",
  "tsconfig.json",
  "tsconfig.base.json",
  "bunfig.toml",
];

/**
 * Conservative content inputs per physical execution.
 * Patterns use the same matcher as path routing (no negation). Prefer broad
 * trees over incomplete maps that could false-green.
 */
export const JOB_CONTENT_INPUTS: Record<CacheableExecution, readonly string[]> = {
  packages_dist: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
  ],
  unit: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "benchmarks/**",
    "scripts/**",
    "tests/evals/**",
    "docs/accessibility/**",
    ".github/ISSUE_TEMPLATE/**",
    ".github/DISCUSSION_TEMPLATE/**",
    ".changeset/**",
    "skills/**",
    "lifecycle.json",
    "apps/docs/**",
    "examples/**",
    ".github/workflows/**",
    // scripts/actionlint.test.ts asserts self-hosted labels against this file.
    ".github/actionlint.yaml",
    "support-matrix.json",
    ".oxlintrc.json",
    ".oxfmtrc.json",
    ".markdownlint-cli2.jsonc",
    "knip.jsonc",
    ".pre-commit-config.yaml",
  ],
  build: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "apps/docs/**",
    "examples/**",
    "scripts/**",
    "tests/evals/**",
    "skills/**",
    "lifecycle.json",
    "support-matrix.json",
    ".oxlintrc.json",
    ".oxfmtrc.json",
    ".markdownlint-cli2.jsonc",
    "knip.jsonc",
    ".pre-commit-config.yaml",
    ".github/workflows/**",
  ],
  actions_security: [
    ...UNIVERSAL_CONTENT_INPUTS,
    ".github/workflows/**",
    ".github/actionlint.yaml",
    "scripts/actionlint.ts",
    "scripts/actionlint.test.ts",
  ],
  bench_smoke: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "benchmarks/**",
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
  ],
  interaction_perf: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "tests/performance/**",
    "apps/docs/src/routes/__perf/**",
    "benchmarks/interaction-budgets.json",
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "apps/docs/**",
    "examples/**",
  ],
  component_svelte: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "skills/ggsvelte/**",
  ],
  component_spikes: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "spikes/**",
  ],
  component_journeys: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "apps/docs/**",
    "examples/**",
    "tests/visual/**",
    "skills/ggsvelte/**",
    "lifecycle.json",
    "scripts/gen-llms.ts",
    "scripts/diagnostic-docs.ts",
    "scripts/quickstart.ts",
    "scripts/gen-manifest.ts",
    "scripts/gen-lifecycle.ts",
  ],
  consumer: [
    ...UNIVERSAL_CONTENT_INPUTS,
    "packages/spec/**",
    "packages/core/**",
    "packages/svelte/**",
    "scripts/consumer-compat.ts",
    "scripts/consumer-compat.test.ts",
    "scripts/quickstart.ts",
    "scripts/quickstart-timing.ts",
    "scripts/quickstart-timing.test.ts",
    "scripts/support-matrix.ts",
    "scripts/support-matrix.test.ts",
    "support-matrix.json",
  ],
};

export function listJobContentPaths(
  execution: CacheableExecution,
  allPaths: readonly string[],
): string[] {
  const patterns = JOB_CONTENT_INPUTS[execution];
  const matched = new Set<string>();
  for (const raw of allPaths) {
    const file = raw.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file || file === ".") continue;
    for (const pattern of patterns) {
      if (matchPathPattern(pattern, file)) {
        matched.add(file);
        break;
      }
    }
  }
  return [...matched].toSorted();
}

export type HashJobInputsOptions = {
  /** Override schema (tests only). Production always uses CONTENT_HASH_SCHEMA. */
  schema?: number;
};

/**
 * Fail-closed content hash. `digests` must be non-empty and is hashed as-is
 * (caller filters via listJobContentPaths + requireJobInputDigests).
 */
export function hashJobInputs(
  execution: CacheableExecution,
  digests: ReadonlyMap<string, string>,
  options: HashJobInputsOptions = {},
): string {
  if (digests.size === 0) {
    throw new Error(`hashJobInputs(${execution}): no input digests`);
  }
  const schema = options.schema ?? CONTENT_HASH_SCHEMA;
  const patterns = JOB_CONTENT_INPUTS[execution];
  const lines: string[] = [
    `schema=${schema}`,
    `execution=${execution}`,
    `patterns=${patterns.join("\0")}`,
  ];
  const paths = [...digests.keys()].toSorted();
  for (const path of paths) {
    const digest = digests.get(path);
    if (digest === undefined || digest.length === 0) {
      throw new Error(`hashJobInputs(${execution}): missing digest for ${path}`);
    }
    lines.push(`${path}\0${digest}`);
  }
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

/**
 * Fail-closed filter: every path in `requiredPaths` must have a non-empty digest.
 */
export function requireJobInputDigests(
  execution: CacheableExecution,
  requiredPaths: readonly string[],
  digests: ReadonlyMap<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  const missing: string[] = [];
  for (const path of requiredPaths) {
    const digest = digests.get(path);
    if (digest === undefined || digest.length === 0) {
      missing.push(path);
      continue;
    }
    out.set(path, digest);
  }
  if (missing.length > 0) {
    throw new Error(
      `requireJobInputDigests(${execution}): missing digest for ${missing.join(", ")}`,
    );
  }
  return out;
}

export function shouldBypassContentCache(changes: ChangeFlags, options: PlanOptions = {}): boolean {
  if (options.forceAll === true) return true;
  return changes.lockfile || changes.ci_workflow || changes.ci_routing || changes.ci_actions;
}

export type FormatGithubOutputOptions = {
  bypassContentCache?: boolean;
};

export type ContentHashCacheKeyInput = {
  execution: CacheableExecution;
  hash: string;
  os: string;
  /** Extra dimensions for matrixed jobs (consumer). */
  matrix?: {
    node: string;
    packageManager: string;
    packageManagerVersion: string;
    svelte: string;
  };
  /**
   * Resolved toolchain versions after setup-node / setup-bun (consumer).
   * Matrix majors alone are not enough: Node/npm patch bumps must miss cache.
   */
  runtime?: {
    nodeVersion: string;
    packageManagerVersion: string;
  };
  /** Playwright / container pin when relevant. */
  containerTag?: string;
};

export function contentHashCacheKey(input: ContentHashCacheKeyInput): string {
  const parts = [`ggsvelte-ch-v${CONTENT_HASH_SCHEMA}`, input.execution, sanitizeKeyPart(input.os)];
  if (input.containerTag !== undefined && input.containerTag.length > 0) {
    parts.push(sanitizeKeyPart(input.containerTag));
  }
  if (input.matrix !== undefined) {
    parts.push(
      `node${sanitizeKeyPart(input.matrix.node)}`,
      sanitizeKeyPart(input.matrix.packageManager),
      `pm${sanitizeKeyPart(input.matrix.packageManagerVersion)}`,
      `svelte${sanitizeKeyPart(input.matrix.svelte)}`,
    );
  }
  if (input.runtime !== undefined) {
    parts.push(
      `runtime-node${sanitizeKeyPart(input.runtime.nodeVersion)}`,
      `runtime-pm${sanitizeKeyPart(input.runtime.packageManagerVersion)}`,
    );
  }
  parts.push(input.hash);
  return parts.join("-");
}

function sanitizeKeyPart(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]+/g, "");
}

export type SuccessMarker = {
  schema: number;
  execution: CacheableExecution;
  hash: string;
};

export function serializeSuccessMarker(marker: SuccessMarker): string {
  return `${JSON.stringify(marker)}\n`;
}

export function parseSuccessMarker(body: string): SuccessMarker | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed === null || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.schema !== "number") return null;
    if (typeof obj.execution !== "string") return null;
    if (typeof obj.hash !== "string" || obj.hash.length === 0) return null;
    if (!(CACHEABLE_EXECUTIONS as readonly string[]).includes(obj.execution)) return null;
    return {
      schema: obj.schema,
      execution: obj.execution as CacheableExecution,
      hash: obj.hash,
    };
  } catch {
    return null;
  }
}

export function validateSuccessMarker(
  marker: SuccessMarker | null,
  expected: { execution: CacheableExecution; hash: string; schema?: number },
): boolean {
  if (marker === null) return false;
  const schema = expected.schema ?? CONTENT_HASH_SCHEMA;
  return (
    marker.schema === schema &&
    marker.execution === expected.execution &&
    marker.hash === expected.hash
  );
}

/** Success-marker path relative to repo root (actions/cache path). */
export function successMarkerPath(execution: CacheableExecution): string {
  return `.ci-content-hash/${execution}.ok`;
}

/** Parse one `git ls-tree -r` line into mode/type/oid/path. */
export function parseGitLsTreeLine(
  line: string,
): { mode: string; type: string; oid: string; path: string } | null {
  if (line.length === 0) return null;
  // <mode> <type> <oid>\t<path>
  const tab = line.indexOf("\t");
  if (tab < 0) return null;
  const meta = line.slice(0, tab);
  const path = line.slice(tab + 1);
  const parts = meta.split(" ");
  if (parts.length < 3) return null;
  const mode = parts[0];
  const type = parts[1];
  const oid = parts[2];
  if (
    mode === undefined ||
    type === undefined ||
    oid === undefined ||
    oid.length === 0 ||
    path.length === 0
  ) {
    return null;
  }
  return { mode, type, oid, path };
}

/**
 * Tree-entry digest includes mode so executable-bit flips miss the cache
 * (blob OID alone is unchanged on mode-only edits).
 */
export function formatTreeEntryDigest(mode: string, oid: string): string {
  return `${mode}:${oid}`;
}

/**
 * Playwright container jobs may run as root while the checkout is owned by
 * the Actions runner user — git then refuses `ls-tree` with "dubious ownership".
 * Mark the worktree safe before hashing (idempotent).
 *
 * Do not discover the path via `git rev-parse`: that command is itself rejected
 * under dubious ownership (empty topOut → no-op → ls-tree still fails). Use
 * process.cwd() and GITHUB_WORKSPACE instead.
 */
async function ensureGitSafeDirectory(): Promise<void> {
  const dirs = new Set<string>();
  const cwd = process.cwd();
  if (cwd.length > 0) dirs.add(cwd);
  const workspace = process.env.GITHUB_WORKSPACE;
  if (workspace !== undefined && workspace.length > 0) dirs.add(workspace);

  for (const dir of dirs) {
    const mark = Bun.spawn(["git", "config", "--global", "--add", "safe.directory", dir], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await mark.exited;
  }
}

/**
 * Collect blob digests for HEAD via `git ls-tree -r`. Fail-closed on git errors
 * or missing digests for matched paths. Digests are `mode:oid` (not oid alone).
 */
export async function collectGitHeadInputDigests(
  execution: CacheableExecution,
): Promise<{ paths: string[]; digests: Map<string, string>; hash: string }> {
  await ensureGitSafeDirectory();
  const proc = Bun.spawn(["git", "ls-tree", "-r", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`git ls-tree failed (exit ${code}): ${stderr.trim()}`);
  }

  const allDigests = new Map<string, string>();
  for (const line of stdout.split(/\r?\n/)) {
    const entry = parseGitLsTreeLine(line);
    if (entry === null) continue;
    if (entry.type !== "blob") continue;
    allDigests.set(entry.path, formatTreeEntryDigest(entry.mode, entry.oid));
  }

  const paths = listJobContentPaths(execution, [...allDigests.keys()]);
  if (paths.length === 0) {
    throw new Error(`collectGitHeadInputDigests(${execution}): no paths matched content inputs`);
  }
  const digests = requireJobInputDigests(execution, paths, allDigests);
  const hash = hashJobInputs(execution, digests);
  return { paths, digests, hash };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const cmd = args[0] ?? "help";

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  if (cmd === "classify") {
    const files = await resolveFiles(args.slice(1));
    const flags = classifyChangedPaths(files);
    process.stdout.write(`${JSON.stringify(flags, null, 2)}\n`);
    return;
  }

  if (cmd === "plan") {
    const { files, forceAll } = await resolvePlanArgs(args.slice(1));
    const plan = planJobs(classifyChangedPaths(files), { forceAll });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  if (cmd === "emit-github-output") {
    const { files, forceAll } = await resolvePlanArgs(args.slice(1));
    const changes = classifyChangedPaths(files);
    const plan = planJobs(changes, { forceAll });
    const bypassContentCache = shouldBypassContentCache(changes, { forceAll });
    const body = formatGithubOutputs(plan, { bypassContentCache });
    const outPath = process.env.GITHUB_OUTPUT;
    if (typeof outPath === "string" && outPath.length > 0) {
      appendFileSync(outPath, body);
    }
    process.stdout.write(body);
    return;
  }

  if (cmd === "hash-inputs") {
    await runHashInputsCli(args.slice(1));
    return;
  }

  if (cmd === "write-success-marker") {
    runWriteSuccessMarkerCli(args.slice(1));
    return;
  }

  if (cmd === "validate-success-marker") {
    await runValidateSuccessMarkerCli(args.slice(1));
    return;
  }

  if (cmd === "gate") {
    const requiredPath = flagValue(args, "--required");
    const resultsPath = flagValue(args, "--results");
    if (requiredPath === undefined || resultsPath === undefined) {
      throw new Error("gate requires --required <json-file-or--> and --results <json-file-or-->");
    }
    const required = JSON.parse(await readArg(requiredPath)) as JobPlan;
    const results = JSON.parse(await readArg(resultsPath)) as Partial<Record<JobName, string>>;
    const gate = evaluateGate(required, results);
    process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
    if (!gate.ok) {
      process.stderr.write(`ci-gate failed: ${gate.failures.join(", ")}\n`);
      process.exitCode = 1;
    }
    return;
  }

  printHelp();
  process.exitCode = 1;
}

function printHelp(): void {
  process.stdout.write(`Usage:
  bun scripts/ci-routing.ts classify [--files f1 f2 | --from-git --base <ref> | --stdin]
  bun scripts/ci-routing.ts plan [--files ... | --from-git --base <ref> | --stdin] [--force-all]
  bun scripts/ci-routing.ts emit-github-output [--files ... | --from-git --base <ref> | --stdin] [--force-all]
  bun scripts/ci-routing.ts hash-inputs --execution <name> [--os <runner.os>] [--container-tag <tag>] [--matrix-node N --matrix-pm NAME --matrix-pm-version V --matrix-svelte V] [--runtime-node-version V --runtime-pm-version V]
  bun scripts/ci-routing.ts write-success-marker --execution <name> --hash <hex>
  bun scripts/ci-routing.ts validate-success-marker --execution <name> --hash <hex>
  bun scripts/ci-routing.ts gate --required <file|-> --results <file|->

  --from-git uses git diff --name-status (rename source + dest).
  --stdin accepts plain paths or name-status lines (tab-separated).
  hash-inputs uses git ls-tree -r HEAD (fail-closed). Emits hash + cache_key (+ GITHUB_OUTPUT).
`);
}

function parseCacheableExecution(raw: string | undefined): CacheableExecution {
  if (raw === undefined || raw.length === 0) {
    throw new Error("--execution <name> is required");
  }
  if (!(CACHEABLE_EXECUTIONS as readonly string[]).includes(raw)) {
    throw new Error(
      `unknown execution "${raw}"; expected one of: ${CACHEABLE_EXECUTIONS.join(", ")}`,
    );
  }
  return raw as CacheableExecution;
}

async function runHashInputsCli(args: string[]): Promise<void> {
  const execution = parseCacheableExecution(flagValue(args, "--execution"));
  const os = flagValue(args, "--os") ?? process.env.RUNNER_OS ?? "unknown";
  const containerTag = flagValue(args, "--container-tag");
  const matrixNode = flagValue(args, "--matrix-node");
  const matrixPm = flagValue(args, "--matrix-pm");
  const matrixPmVersion = flagValue(args, "--matrix-pm-version");
  const matrixSvelte = flagValue(args, "--matrix-svelte");
  const runtimeNodeVersion = flagValue(args, "--runtime-node-version");
  const runtimePmVersion = flagValue(args, "--runtime-pm-version");

  const { hash, paths } = await collectGitHeadInputDigests(execution);
  const matrix =
    matrixNode !== undefined &&
    matrixPm !== undefined &&
    matrixPmVersion !== undefined &&
    matrixSvelte !== undefined
      ? {
          node: matrixNode,
          packageManager: matrixPm,
          packageManagerVersion: matrixPmVersion,
          svelte: matrixSvelte,
        }
      : undefined;

  const runtime =
    runtimeNodeVersion !== undefined &&
    runtimeNodeVersion.length > 0 &&
    runtimePmVersion !== undefined &&
    runtimePmVersion.length > 0
      ? { nodeVersion: runtimeNodeVersion, packageManagerVersion: runtimePmVersion }
      : undefined;

  if (execution === "consumer" && (matrix === undefined || runtime === undefined)) {
    throw new Error(
      "hash-inputs consumer requires --matrix-* and --runtime-node-version / --runtime-pm-version",
    );
  }

  const cacheKey = contentHashCacheKey({
    execution,
    hash,
    os,
    containerTag: containerTag ?? undefined,
    matrix,
    runtime,
  });
  const marker = successMarkerPath(execution);
  const body = [
    `hash=${hash}`,
    `cache_key=${cacheKey}`,
    `marker_path=${marker}`,
    `path_count=${paths.length}`,
    `execution=${execution}`,
  ].join("\n");

  const outPath = process.env.GITHUB_OUTPUT;
  if (typeof outPath === "string" && outPath.length > 0) {
    appendFileSync(outPath, `${body}\n`);
  }
  process.stdout.write(`${body}\n`);
}

function runWriteSuccessMarkerCli(args: string[]): void {
  const execution = parseCacheableExecution(flagValue(args, "--execution"));
  const hash = flagValue(args, "--hash");
  if (hash === undefined || hash.length === 0) {
    throw new Error("write-success-marker requires --hash <hex>");
  }
  const path = successMarkerPath(execution);
  const dir = path.slice(0, path.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    serializeSuccessMarker({ schema: CONTENT_HASH_SCHEMA, execution, hash }),
    "utf8",
  );
  process.stdout.write(`${path}\n`);
}

async function runValidateSuccessMarkerCli(args: string[]): Promise<void> {
  const execution = parseCacheableExecution(flagValue(args, "--execution"));
  const hash = flagValue(args, "--hash");
  if (hash === undefined || hash.length === 0) {
    throw new Error("validate-success-marker requires --hash <hex>");
  }
  const path = successMarkerPath(execution);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    process.stdout.write("hit=false\n");
    writeGithubOutput("hit=false\n");
    return;
  }
  const body = await file.text();
  const marker = parseSuccessMarker(body);
  const ok = validateSuccessMarker(marker, { execution, hash });
  const line = `hit=${ok ? "true" : "false"}\n`;
  process.stdout.write(line);
  writeGithubOutput(line);
  if (!ok) {
    process.exitCode = 0; // miss is not a failure — caller runs full job
  }
}

function writeGithubOutput(body: string): void {
  const outPath = process.env.GITHUB_OUTPUT;
  if (typeof outPath === "string" && outPath.length > 0) {
    appendFileSync(outPath, body);
  }
}

async function resolvePlanArgs(args: string[]): Promise<{ files: string[]; forceAll: boolean }> {
  const forceAll = args.includes("--force-all");
  const files = await resolveFiles(args.filter((a) => a !== "--force-all"));
  return { files, forceAll };
}

async function resolveFiles(args: string[]): Promise<string[]> {
  if (args.includes("--stdin")) {
    const text = await new Response(Bun.stdin.stream()).text();
    // Workflows pass `git diff --name-status` lines so renames keep both paths.
    // Plain path lists (one path per line, no tabs) still work via parseFileList.
    if (text.includes("\t") || /^[AMDCRT?]+\d*\t/m.test(text)) {
      return parseNameStatusList(text);
    }
    return parseFileList(text);
  }

  const filesIdx = args.indexOf("--files");
  if (filesIdx >= 0) {
    return args.slice(filesIdx + 1).filter((a) => !a.startsWith("--"));
  }

  if (args.includes("--from-git")) {
    const base = flagValue(args, "--base");
    if (base === undefined || base === "") {
      throw new Error("--from-git requires --base <ref>");
    }
    // --name-status keeps rename/copy source paths for classification.
    const proc = Bun.spawn(["git", "diff", "--name-status", `${base}...HEAD`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    if (code !== 0) {
      throw new Error(`git diff failed (exit ${code}): ${stderr.trim()}`);
    }
    return parseNameStatusList(stdout);
  }

  // Default: empty list (caller should pass --force-all when appropriate).
  return [];
}

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0) return undefined;
  return args[i + 1];
}

function readArg(path: string): Promise<string> {
  if (path === "-") return new Response(Bun.stdin.stream()).text();
  return Bun.file(path).text();
}

if (import.meta.main) {
  try {
    await main(process.argv);
  } catch (err: unknown) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
