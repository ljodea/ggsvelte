/**
 * CI path routing — lane classification and job planning.
 *
 * - classifyChangedPaths: changed paths → lane flags (fail-closed docs_render).
 * - planJobs: lanes → jobs, including monorepo dependency edges and force
 *   tiers. evaluateGate / formatGithubOutputs consume the same job universe.
 */
import { isDocsRenderPath } from "./docs-membership";
import { matchPathPattern } from "./match";
import { LANE_PATTERNS } from "./patterns";
import type { ChangeFlags, ChangeLane, JobName, JobPlan, JobResult } from "./types";

const JOB_NAMES: readonly JobName[] = [
  "checks",
  "unit",
  "component",
  "consumer",
  "build",
  "svelte_check",
  "docs_site",
  "actions_security",
  "bench_smoke",
  "interaction_perf",
  "packages_dist",
  "vr",
  "pages",
  "docs_journeys",
] as const;

const LANE_NAMES = Object.keys(LANE_PATTERNS) as (keyof typeof LANE_PATTERNS)[];

export function emptyChangeFlags(): ChangeFlags {
  const flags = {} as Record<keyof typeof LANE_PATTERNS, boolean>;
  for (const lane of LANE_NAMES) flags[lane] = false;
  return flags;
}

export function classifyChangedPaths(files: readonly string[]): ChangeFlags {
  const flags = emptyChangeFlags();
  for (const raw of files) {
    const file = raw.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file || file === ".") continue;
    for (const lane of LANE_NAMES) {
      if (lane === "docs_render") continue; // set below (fail-closed allowlist)
      if (flags[lane]) continue;
      for (const pattern of LANE_PATTERNS[lane]) {
        if (matchPathPattern(pattern, file)) {
          flags[lane] = true;
          break;
        }
      }
    }
    if (isDocsRenderPath(file)) flags.docs_render = true;
  }
  return flags;
}

export type PlanOptions = {
  /** When true, every job is scheduled (missing base ref / rebuild-all). */
  forceAll?: boolean;
};

function anyChanged(changes: ChangeFlags, lanes: readonly ChangeLane[]): boolean {
  return lanes.some((lane) => changes[lane]);
}

function anyTrue(...values: readonly boolean[]): boolean {
  return values.includes(true);
}

/**
 * Map change lanes → jobs, including monorepo dependency edges:
 * spec → core consumers; core → svelte; packages → VR/pages/build/consumer.
 *
 * Coverage edges restored after path-routing (Codex review on #242):
 * - unit also covers docs/examples/workflows/svelte (script tests live only there)
 * - consumer follows consumer harness scripts as well as packages
 * - bench_smoke follows svelte (retained-memory imports inspection)
 * - docs generators (gen-llms / lifecycle.json) sit on the docs lane → pages
 * - pixel VR follows package surface, examples, visual tests, or docs_render only
 * - docs_journeys covers non-pixel Playwright structure/a11y for docs content PRs
 * - workers run unit (own bun suite when present) + build (type-aware lint / knip)
 *
 * Force tiers (do not collapse these):
 * - `forceProduct`: lockfile or ci-routing self-change — full package/browser surface.
 * - CI plumbing (`ci_workflow`, `ci_actions`): checks + unit + actions-security.
 *   Never alone schedule VR / component / consumer / pages. Content-hash bypass
 *   still applies (recipe identity). unit covers release-wiring assertions over
 *   workflow YAML and composite action.yml (content-hash protocol).
 */
export function planJobs(changes: ChangeFlags, options: PlanOptions = {}): JobPlan {
  if (options.forceAll === true) {
    const all = {} as JobPlan;
    for (const job of JOB_NAMES) all[job] = true;
    return all;
  }

  // Product-wide force. Intentionally excludes ci.yml / .github/actions so
  // Dependabot action pin bumps stay on the cheap CI-plumbing surface.
  const forceProduct = anyChanged(changes, ["lockfile", "ci_routing"]);
  const packageSurface = anyTrue(
    anyChanged(changes, ["spec", "core", "svelte", "cli"]),
    forceProduct,
  );
  const docsSurface = anyTrue(anyChanged(changes, ["docs", "examples"]), forceProduct);
  const browserSurface = anyTrue(
    packageSurface,
    anyChanged(changes, ["spikes", "visual", "performance"]),
  );
  // Split former monolithic "build" job so expensive steps fail/finish in parallel:
  // - build: package tsc + knip + type-aware + publint (scripts/evals need this)
  // - svelte_check: packages/svelte + apps/docs svelte-check (product surface only)
  // - docs_site: vite adapter-static + pages-links (product surface only)
  // A scripts/**/*.test.ts change must NOT schedule svelte_check or docs_site.
  const staticAnalysisSurface = anyTrue(
    packageSurface,
    docsSurface,
    anyChanged(changes, ["scripts", "evals", "workers"]),
  );
  const svelteCheckSurface = anyTrue(packageSurface, docsSurface);
  const docsSiteSurface = anyTrue(packageSurface, docsSurface);

  // Pixel VR: render-relevant only (not pure guide/content generators).
  const vr = anyTrue(packageSurface, anyChanged(changes, ["examples", "visual", "docs_render"]));

  // Non-pixel docs structure/a11y Playwright — content and render both need it.
  const docsJourneys = anyTrue(docsSurface, packageSurface, changes.visual);

  // Shared packages/*/dist artifact for jobs that previously each ran
  // `bun run build`. Unit/bench-smoke stay on the cheaper `bun run check`
  // (spec/core only) and do not wait on the full Svelte package build.
  // packages_dist must follow vr and docs_journeys so artifact consumers never skip.
  const packagesDist = anyTrue(
    packageSurface,
    anyChanged(changes, ["spikes", "visual", "performance", "consumer_tools"]),
    vr,
    docsJourneys,
  );

  return {
    // Cheap format/lint parity — always on so markdown-only PRs still get oxfmt/prettier.
    checks: true,
    unit: anyTrue(
      anyChanged(changes, [
        "spec",
        "core",
        "svelte",
        "cli",
        "scripts",
        "benchmarks",
        "evals",
        "workers",
        "docs",
        "examples",
        "workflows",
        "ci_actions",
      ]),
      // workers/** own bun tests (when present) run in the unit job.
      // release-wiring.test.ts reads composite action.yml and asserts the
      // content-hash protocol; schedule unit when those recipes change.
      forceProduct,
    ),
    component: browserSurface,
    consumer: anyTrue(packageSurface, changes.consumer_tools, forceProduct),
    build: staticAnalysisSurface,
    svelte_check: svelteCheckSurface,
    docs_site: docsSiteSurface,
    // Composite action recipe edits must still lint the actions surface even
    // when no workflow YAML changed (Dependabot directories for composites).
    actions_security: anyTrue(changes.workflows, changes.ci_actions, forceProduct),
    // retained-memory imports packages/svelte inspection coordinator.
    bench_smoke: anyTrue(
      anyChanged(changes, ["benchmarks", "spec", "core", "svelte", "cli"]),
      forceProduct,
    ),
    // Informational only; path-gated and independent of the component job.
    interaction_perf: browserSurface,
    packages_dist: packagesDist,
    vr,
    pages: anyTrue(packageSurface, docsSurface, forceProduct),
    docs_journeys: docsJourneys,
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
    const result = normalizeJobResult(results[job]);
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

/** Coerce a raw `needs.<job>.result` string to `JobResult`; missing/empty → skipped. */
export function normalizeJobResult(value: string | undefined): JobResult {
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

export function jobNames(): readonly JobName[] {
  return JOB_NAMES;
}
