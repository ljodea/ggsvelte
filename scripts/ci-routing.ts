/**
 * CI path routing — single source of truth for which expensive jobs a change
 * should schedule. Workflows call the CLI to emit GITHUB_OUTPUT flags; unit
 * tests lock the classification + dependency edges so routing cannot silently
 * shrink coverage.
 *
 * Design notes:
 * - Prefer pure functions over third-party path-filter actions so filters are
 *   tested in-repo and SHA-pinned action surface stays small.
 * - `forceAll` is the safe fallback when git cannot compute a base (missing
 *   event.before, shallow history, etc.).
 * - Changing `.github/workflows/ci.yml` itself forces the full CI surface so a
 *   routing edit cannot land without exercising the jobs it controls.
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

  const force = changes.lockfile || changes.ci_workflow || changes.ci_routing;
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

export function formatGithubOutputs(plan: JobPlan): string {
  const lines: string[] = [];
  for (const job of JOB_NAMES) {
    lines.push(`${job}=${plan[job] ? "true" : "false"}`);
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
    const plan = planJobs(classifyChangedPaths(files), { forceAll });
    const body = formatGithubOutputs(plan);
    const outPath = process.env.GITHUB_OUTPUT;
    if (typeof outPath === "string" && outPath.length > 0) {
      const { appendFileSync } = await import("node:fs");
      appendFileSync(outPath, body);
    }
    process.stdout.write(body);
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
  bun scripts/ci-routing.ts gate --required <file|-> --results <file|->

  --from-git uses git diff --name-status (rename source + dest).
  --stdin accepts plain paths or name-status lines (tab-separated).
`);
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
