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
 */

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
    "scripts/llms-markdown.ts",
    "scripts/llms-guide-content.ts",
    "scripts/docs-seo.ts",
    "scripts/diagnostic-docs.ts",
    "scripts/quickstart.ts",
    "scripts/cli-docs.ts",
    "scripts/guide-code-contract.ts",
    "scripts/gen-docs-search.ts",
    "scripts/gen-gallery-previews.ts",
    "scripts/gen-gallery-previews.test.ts",
    // Deployment generators and smoke contracts change the published artifact.
    "scripts/cloudflare-pages-config.test.ts",
    "scripts/deployment-artifact.ts",
    "scripts/deployment-artifact.test.ts",
    "scripts/deployment-smoke.ts",
    "scripts/deployment-smoke-cli.ts",
    "scripts/deployment-smoke.test.ts",
    "scripts/gen-legacy-routes.ts",
    "scripts/legacy-artifact.ts",
    "scripts/legacy-artifact.test.ts",
    "scripts/legacy-migration.ts",
    "scripts/legacy-migration.test.ts",
    "scripts/legacy-routes.ts",
    "scripts/legacy-routes.test.ts",
    // Public gallery previews are materialized from canonical light baselines.
    "tests/visual/__screenshots__/**",
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
  ci_routing: ["scripts/ci-routing.ts", "scripts/ci-routing.test.ts", "scripts/ci-routing/**"],
  // Local composite actions used by ci.yml (content-hash restore/write). A change
  // here is a CI recipe change: bypass content-hash caches, schedule
  // actions-security — but do not product-force VR/component/consumer.
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
    // Packed fixture snippets live here; consumer-compat imports them.
    "scripts/guide-code-contract.ts",
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
 *
 * Force tiers (do not collapse these):
 * - `forceProduct`: lockfile or ci-routing self-change — full package/browser surface.
 * - CI plumbing (`ci_workflow`, `ci_actions`): actions-security (+ unit via the
 *   workflows lane when YAML changed). Never alone schedule VR / component /
 *   consumer / pages. Content-hash bypass still applies (recipe identity).
 */
export function planJobs(changes: ChangeFlags, options: PlanOptions = {}): JobPlan {
  if (options.forceAll === true) {
    const all = {} as JobPlan;
    for (const job of JOB_NAMES) all[job] = true;
    return all;
  }

  // Product-wide force. Intentionally excludes ci.yml / .github/actions so
  // Dependabot action pin bumps stay on the cheap CI-plumbing surface.
  const forceProduct = changes.lockfile || changes.ci_routing;
  const packageSurface = changes.spec || changes.core || changes.svelte || forceProduct;
  const docsSurface = changes.docs || changes.examples || forceProduct;
  const browserSurface =
    packageSurface || changes.spikes || changes.visual || changes.performance || forceProduct;
  // knip / type-aware / docs+examples check live on the build job once pre-push
  // parity is dropped from the checks job (to avoid double-running unit/build).
  const staticAnalysisSurface =
    packageSurface || docsSurface || changes.scripts || changes.evals || forceProduct;

  // Shared packages/*/dist artifact for jobs that previously each ran
  // `bun run build`. Unit/bench-smoke stay on the cheaper `bun run check`
  // (spec/core only) and do not wait on the full Svelte package build.
  const packagesDist =
    packageSurface ||
    changes.spikes ||
    changes.visual ||
    changes.performance ||
    changes.consumer_tools ||
    forceProduct;

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
      forceProduct,
    component: browserSurface,
    consumer: packageSurface || changes.consumer_tools || forceProduct,
    build: staticAnalysisSurface,
    // Composite action recipe edits must still lint the actions surface even
    // when no workflow YAML changed (Dependabot directories for composites).
    actions_security: changes.workflows || changes.ci_actions || forceProduct,
    // retained-memory imports packages/svelte inspection coordinator.
    bench_smoke:
      changes.benchmarks || changes.spec || changes.core || changes.svelte || forceProduct,
    // Informational only; path-gated and independent of the component job.
    interaction_perf: browserSurface,
    packages_dist: packagesDist,
    vr: packageSurface || docsSurface || changes.visual || forceProduct,
    pages: packageSurface || docsSurface || forceProduct,
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

export type FormatGithubOutputOptions = {
  bypassContentCache?: boolean;
};

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
