import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
/** Orchestrator + reusable domain workflows (issue #392 multi-file CI). */
const readCiSurface = () => {
  const dir = join(root, ".github/workflows");
  return readdirSync(dir)
    .filter((f) => f === "ci.yml" || (f.startsWith("ci-") && f.endsWith(".yml")))
    .toSorted()
    .map((f) => read(`.github/workflows/${f}`))
    .join("\n");
};
/** Prefer domain job body (has steps) over thin orchestrator `uses:` caller. */
const ciJob = (ci: string, jobId: string): string => {
  const marker = `  ${jobId}:\n`;
  let start = -1;
  let from = 0;
  while (true) {
    const idx = ci.indexOf(marker, from);
    if (idx === -1) break;
    const window = ci.slice(idx, idx + 1200);
    if (window.includes("steps:")) {
      start = idx;
      break;
    }
    from = idx + marker.length;
  }
  if (start === -1) start = ci.indexOf(marker);
  if (start === -1) return "";
  const rest = ci.slice(start + 1);
  const next = rest.search(/\n  [a-z0-9_-]+:\n/);
  return next === -1 ? ci.slice(start) : ci.slice(start, start + 1 + next);
};
/** Suite path arguments of a `bun test …` invocation (flags and values dropped). */
const suiteArgs = (command: string): string[] => {
  const start = command.indexOf("bun test");
  if (start === -1) return [];
  return command
    .slice(start + "bun test".length)
    .trim()
    .split(/\s+/)
    .filter((arg) => arg.length > 0 && !arg.startsWith("-"));
};
const selfHostedGgsvelteCount = (workflow: string) =>
  workflow
    .split("\n")
    .filter(
      (line) =>
        line.trimStart().startsWith("runs-on:") &&
        line.includes("ggsvelte") &&
        !line.includes("ggsvelte-heavy"),
    ).length;
const heavyRunsOnCount = (workflow: string) =>
  workflow
    .split("\n")
    .filter((line) => line.trimStart().startsWith("runs-on:") && line.includes("ggsvelte-heavy"))
    .length;

describe("R0 release wiring", () => {
  it("runs benchmark unit tests in CI (not on git push hooks)", () => {
    const ci = readCiSurface();
    // CI collects lcov for Codecov. Package tests are CI-only — pre-push was
    // nuked so agents can push without re-running the full unit suite locally.
    expect(ci).toContain("packages/spec packages/core benchmarks scripts tests/evals");
    expect(ci).toContain("--coverage-reporter=lcov");
    expect(ci).toContain("coverage/unit");
    expect(ci).toContain("codecov/codecov-action@");
    expect(ci).toContain("flags: unit");
    expect(ci).toContain("flags: svelte");
    expect(read("codecov.yml")).toContain("component_id: packages-spec");
    expect(read(".pre-commit-config.yaml")).not.toContain("bun test packages/spec");
    expect(read(".pre-commit-config.yaml")).not.toContain("pre-push");
  });

  it("runs every root `bun test` suite in the CI unit job (issue #720)", () => {
    // The root `test` script is the canonical suite list. Anything present there
    // but absent from ci-unit.yml is a local-only suite that merges green.
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const rootSuites = suiteArgs(pkg.scripts["test"] ?? "");
    expect(rootSuites).toContain("workers/playground-api");

    // Folded (`run: >`) scalar — collapse whitespace, then take the single
    // coverage invocation up to the next step. Anchored on `--coverage` so the
    // job's display name ("unit (bun test spec + core)") cannot match instead.
    const unit = read(".github/workflows/ci-unit.yml").replaceAll(/\s+/g, " ");
    const invocations = unit.match(/bun test --coverage/g) ?? [];
    expect(invocations.length, "ci-unit.yml has exactly one coverage bun test").toBe(1);
    const start = unit.indexOf("bun test --coverage");
    const end = unit.indexOf(" - name: Upload unit coverage", start);
    expect(end, "ci-unit.yml uploads unit coverage after bun test").toBeGreaterThan(start);
    const ciSuites = suiteArgs(unit.slice(start, end));

    for (const suite of rootSuites) {
      expect(ciSuites, `ci-unit.yml runs ${suite}`).toContain(suite);
    }
  });

  it("typechecks the playground-api worker inside `bun run check` (issue #725)", () => {
    // The worker has no build step — wrangler bundles straight from source — so
    // this dedicated project is its only tsc coverage. The root tsconfig.json
    // includes workers/** for oxlint --type-aware, but nothing ever ran tsc on
    // it (#725), and type-aware lint rules are a strict subset of tsc
    // diagnostics: assignability and optionality errors slipped through.
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:workers"]).toContain("tsc -p workers/playground-api");
    // Chained into `check`, which ci-unit.yml runs and `build` re-enters.
    expect(pkg.scripts["check"]).toContain("bun run check:workers");
    // Whole-line: `bun run check:pages-links` &c must not satisfy this.
    expect(read(".github/workflows/ci-unit.yml")).toMatch(/^\s*run: bun run check$/mu);

    // src alone would leave the bun:test suite unchecked, and 15 of the 41
    // errors the project first surfaced were in it.
    const project = read("workers/playground-api/tsconfig.json");
    for (const glob of ['"src/**/*.ts"', '"test/**/*.ts"']) {
      expect(project, `worker tsconfig includes ${glob}`).toContain(glob);
    }
    // eval/** stays out on purpose: it imports the docs client's envelope
    // parser, and apps/docs is checked by svelte-check under a config that does
    // not extend tsconfig.base.json. Pulling it in would make docs edits fail
    // this worker gate instead of check:docs.
    expect(project).not.toContain('"eval/');
    // Tripwire on the reason, not just the outcome: if that import goes away,
    // eval/** can be folded into the project and this test should be revisited.
    expect(
      read("workers/playground-api/eval/run-eval.ts"),
      "eval/** exclusion is justified by its apps/docs import",
    ).toContain("apps/docs/src/lib/playground-agent-envelope");
  });

  it("typechecks scripts/ci-routing inside `bun run check` (issue #734)", () => {
    // Same gap as the worker (#725), one directory further in: scripts/** is in
    // the root tsconfig.json only so oxlint --type-aware has type information,
    // and tsc has never been run on it. ci-routing decides which jobs CI runs,
    // so it is the slice where a silent type error costs the most.
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:scripts-ci-routing"]).toContain("tsc -p scripts/ci-routing");
    // Chained into `check`, which ci-unit.yml runs and `build` re-enters.
    expect(pkg.scripts["check"]).toContain("bun run check:scripts-ci-routing");
    // Whole-line: `bun run check:pages-links` &c must not satisfy this.
    expect(read(".github/workflows/ci-unit.yml")).toMatch(/^\s*run: bun run check$/mu);

    const project = read("scripts/ci-routing/tsconfig.json");
    // Base strictness is the point — the gate is worthless under looser options.
    expect(project).toContain('"extends"');
    expect(project).toContain("tsconfig.base.json");
    // Assert on the include list, not the whole file — `extends` legitimately
    // escapes upwards to the repo root.
    const include = /"include"\s*:\s*\[[^\]]*\]/u.exec(project)?.[0] ?? "";
    // Every .ts in the directory, tests included: the suites are where the
    // module's contracts are asserted, so leaving them out would half-check it.
    expect(include, "tsconfig includes the directory's .ts files").toContain('"./**/*.ts"');
    // Scoped to this directory only, so the routing gate keeps failing on its own
    // terms — scripts/tsconfig.json now covers this code as well, and a narrow
    // project that cannot be skipped past is the point of keeping both.
    expect(include, "include stays inside scripts/ci-routing").not.toContain("..");
    expect(include).not.toContain("apps/");
  });

  it("typechecks the whole scripts tree inside `bun run check` (issue #734)", () => {
    // Closes the gap #725 and #737 each took a slice of: scripts/** sat in the
    // root tsconfig.json only so oxlint --type-aware had type information, and
    // tsc was never run on it. Type-aware lint rules are a strict subset of tsc
    // diagnostics, so 103 assignability, optionality and index-signature errors
    // stood unseen — including a null-deref in the sakura G1 render assertion
    // and two CSP assertions naming build modes that were deleted.
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    // Right-boundary anchored throughout: "check:scripts" is a prefix of the
    // sibling "check:scripts-ci-routing", so a plain toContain passes on the
    // routing gate alone and this whole assertion goes vacuous.
    expect(pkg.scripts["check:scripts"]).toMatch(/tsc -p scripts(?![\w./-])/u);
    // Chained into `check`, which ci-unit.yml runs and `build` re-enters.
    expect(pkg.scripts["check"]).toMatch(/bun run check:scripts(?![\w:-])/u);
    // Whole-line: `bun run check:pages-links` &c must not satisfy this.
    expect(read(".github/workflows/ci-unit.yml")).toMatch(/^\s*run: bun run check$/mu);

    const project = read("scripts/tsconfig.json");
    // Base strictness is the point — the gate is worthless under looser options,
    // and relaxing them for this tree was the option #734 rejected.
    expect(project).toContain('"extends"');
    expect(project).toContain("tsconfig.base.json");
    // compilerOptions only — the surrounding comment names these flags to explain
    // why they are inherited, and prose must not satisfy or fail the assertion.
    const options = /"compilerOptions"\s*:\s*\{[^}]*\}/u.exec(project)?.[0] ?? "";
    expect(options, "scripts/tsconfig.json declares compilerOptions").not.toBe("");
    for (const relaxed of [
      "noPropertyAccessFromIndexSignature",
      "exactOptionalPropertyTypes",
      "noUncheckedIndexedAccess",
      "strict",
    ]) {
      expect(options, `scripts/tsconfig.json must not re-open ${relaxed}`).not.toContain(relaxed);
    }
    // Assert on the include list, not the whole file — `extends` legitimately
    // escapes upwards to the repo root.
    const include = /"include"\s*:\s*\[[^\]]*\]/u.exec(project)?.[0] ?? "";
    // The whole tree, tests included: the suites are where these scripts'
    // contracts are asserted, and 70 of the 103 errors were in them.
    expect(include, "tsconfig includes the tree's .ts files").toContain('"./**/*.ts"');
  });

  it("checks packed links in CI and the Cloudflare Pages deployment", () => {
    expect(readCiSurface()).toContain("bun run check:pages-links");
    expect(read(".github/workflows/cloudflare-pages.yml")).toContain("bun run build:cloudflare");
    expect(read("package.json")).toContain("check:pages-links");
  });

  it("runs the Playwright interaction performance gate with benchmark budgets", () => {
    const ci = readCiSurface();
    const bench = read(".github/workflows/bench.yml");
    // Browser surface: svelte (chromium) + svelte-fx (firefox/webkit) + spikes.
    // Journeys is docs_journeys-routed.
    const svelteJob = ciJob(ci, "component-svelte");
    const svelteFxJob = ciJob(ci, "component-svelte-fx");
    const spikesJob = ciJob(ci, "component-spikes");
    const journeysJob = ciJob(ci, "component-journeys");
    const interactionPerfJob = ciJob(ci, "interaction-perf");
    // Container jobs pull the prebaked ci-runner image (Playwright + unzip),
    // not the raw upstream Playwright image. The tag still tracks the matrix
    // (see scripts/support-matrix.test.ts).
    expect(ci).toContain("playwright_container_tag: v1.61.1-noble");
    expect(ci).toMatch(
      /ci-runner:\$\{\{ inputs\.playwright_container_tag \}\}|ci-runner:v1\.61\.1-noble/,
    );
    expect(ci).toContain("HOME: /root");
    // Package browser shards download packages/*/dist (issue #241); no monorepo rebuild.
    // Download+verify lives in ci-download-packages-dist (pin + entrypoint checks).
    for (const job of [svelteJob, svelteFxJob, spikesJob]) {
      expect(job).toContain("uses: ./.github/actions/ci-download-packages-dist");
      expect(job).toContain("packages-dist");
      expect(job).not.toContain("run: bun run build\n");
    }
    expect(svelteJob).toContain("working-directory: packages/svelte");
    expect(svelteJob).toContain("--project chromium");
    expect(svelteJob).not.toContain("--project firefox");
    expect(svelteFxJob).toContain("working-directory: packages/svelte");
    expect(svelteFxJob).toContain("--project firefox");
    expect(svelteFxJob).toContain("--project webkit");
    expect(svelteFxJob).not.toContain("--coverage");
    expect(svelteFxJob).toContain("HOME: /root");
    expect(spikesJob).toContain("working-directory: spikes/browser");
    // Journeys: docs_journeys routing + full non-pixel inventory; may build docs site.
    expect(read(".github/workflows/ci.yml")).toContain("docs_journeys == 'true'");
    expect(journeysJob).toContain("uses: ./.github/actions/ci-download-packages-dist");
    expect(journeysJob).toContain("packages-dist");
    expect(journeysJob).toContain("bun run build:docs");
    expect(journeysJob).not.toContain("bun run test:interaction-perf");
    expect(journeysJob).toContain("interaction-accessibility.spec.ts");
    expect(journeysJob).toContain("docs-home-gallery.spec.ts");
    expect(journeysJob).toContain("docs-progressive-search.spec.ts");
    expect(journeysJob).toContain("docs-themes.spec.ts");
    expect(journeysJob).toContain("--grep-invert 'visual contract'");
    // ci-gate: package component = svelte+svelte-fx+spikes; docs_journeys is independent.
    expect(ci).toContain("COMPONENT_SVELTE_RES");
    expect(ci).toContain("COMPONENT_SVELTE_FX_RES");
    expect(ci).toContain("COMPONENT_SPIKES_RES");
    expect(ci).toContain("DOCS_JOURNEYS_RES");
    expect(ci).toContain("DOCS_JOURNEYS_REQ");
    expect(ci).toContain("docs_journeys:");
    expect(interactionPerfJob).toContain("bun run test:interaction-perf");
    // Independent of component shards so it does not serialize the critical path;
    // still path-gated and informational (hard gate remains on run-bench).
    expect(interactionPerfJob).not.toContain("needs: [component]");
    expect(interactionPerfJob).toContain("informational");
    expect(read(".github/workflows/ci.yml")).toContain("interaction_perf == 'true'");
    expect(interactionPerfJob).toContain("uses: ./.github/actions/ci-download-packages-dist");
    expect(interactionPerfJob).toContain("packages-dist");
    expect(bench).toContain("ghcr.io/${{ github.repository }}/ci-runner:v1.61.1-noble");
    expect(bench).toContain("bun run test:interaction-perf");
    expect(read("package.json")).toContain('"test:interaction-perf"');
    expect(read("tests/performance/interaction.spec.ts")).toContain("/__perf/interaction-100k");
    expect(read("apps/docs/src/routes/__perf/interaction-100k/+page.svelte")).toContain(
      "length: 100_000",
    );
  });

  it("shares packages/*/dist via a packages-dist producer job (issue #241)", () => {
    const ci = readCiSurface();
    const producerJob = ciJob(ci, "packages-dist");
    expect(producerJob).toContain("packages_dist == 'true'");
    expect(producerJob).toContain("if-no-files-found: error");
    expect(producerJob).toContain("packages/spec/dist");
    expect(producerJob).toContain("packages/core/dist");
    expect(producerJob).toContain("packages/svelte/dist");
    expect(producerJob).toContain("run: bun run build");
    // Consumers download instead of rebuilding packages (via composite).
    const consumerJob = ciJob(ci, "consumer-compat");
    expect(consumerJob).toContain("uses: ./.github/actions/ci-download-packages-dist");
    expect(consumerJob).toContain("packages-dist");
    expect(consumerJob).not.toContain("run: bun run build");
    // Unit and bench-smoke keep the cheaper bun run check path (Codex plan review).
    const unitJob = ciJob(ci, "unit");
    expect(unitJob).toContain("bun run check");
    expect(unitJob).not.toContain("download-artifact");
  });

  it("content-hash skips scheduled jobs via physical execution keys (issue #245)", () => {
    const ci = readCiSurface();
    const restore = read(".github/actions/ci-content-hash-restore/action.yml");
    const write = read(".github/actions/ci-content-hash-write/action.yml");

    // Protocol lives in composites (single source of truth).
    expect(restore).toContain("hash-inputs");
    expect(restore).toContain("validate-success-marker");
    expect(restore).toContain(".ci-content-hash/");
    expect(restore).toContain("shell: bash");
    // Exact key only — no restore-keys on the success-marker cache step.
    const markerCache = restore.slice(
      restore.indexOf("path: .ci-content-hash/"),
      restore.indexOf("validate-success-marker"),
    );
    expect(markerCache).toContain("key:");
    expect(markerCache).not.toContain("restore-keys:");
    expect(write).toContain("write-success-marker");
    expect(write).toContain("shell: bash");

    // detect-changes exports bypass covering force-all / lockfile / ci.yml / router / actions.
    const detect = ciJob(ci, "detect-changes");
    expect(detect).toContain("bypass_content_cache:");
    // Job driver lives in scripts/ci-routing/detect-changes.ts (issue #393).
    expect(detect).toContain("scripts/ci-routing.ts detect-changes");
    expect(detect).not.toContain("emit-github-output");

    // packages-dist keeps its specialized dist-payload protocol (not the marker composite).
    const producerJob = ciJob(ci, "packages-dist");
    expect(producerJob).toContain("hash-inputs --execution packages_dist");
    expect(producerJob).toContain(".packages-dist-cache");
    expect(producerJob).toContain("steps.restore_dist.outputs.hit != 'true'");
    expect(producerJob).toContain("stage content-hash cache payload");
    const distCacheStep = producerJob.slice(
      producerJob.indexOf("restore packages-dist content-hash cache"),
      producerJob.indexOf("materialize packages/*/dist from content-hash cache"),
    );
    expect(distCacheStep).toContain("key: ${{ steps.content_hash.outputs.cache_key }}");
    expect(distCacheStep).not.toContain("restore-keys:");
    expect(producerJob).not.toContain("ci-content-hash-restore");

    const unitJob = ciJob(ci, "unit");
    expect(unitJob).toContain("uses: ./.github/actions/ci-content-hash-restore");
    expect(unitJob).toContain("uses: ./.github/actions/ci-content-hash-write");
    expect(unitJob).toContain("execution: unit");
    expect(unitJob).toContain("steps.content_hash.outputs.hit != 'true'");
    expect(unitJob).toContain("bypass_content_cache");
    expect(unitJob).toContain("CI_DISABLE_CONTENT_HASH");

    // Distinct physical keys for component shards (Codex P1).
    // component-svelte is longer (coverage + Codecov upload steps) — use a
    // generous window so the content-hash write is still inside the slice.
    for (const [job, execution] of [
      ["component-svelte", "component_svelte"],
      ["component-svelte-fx", "component_svelte_fx"],
      ["component-spikes", "component_spikes"],
      ["component-journeys", "component_journeys"],
    ] as const) {
      const slice = ciJob(ci, job);
      expect(slice.length).toBeGreaterThan(0);
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(slice).toContain(`execution: ${execution}`);
      expect(slice).toContain("container_tag:");
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-write");
    }

    // Consumer: runtime resolution stays in the job; matrix dims pass into restore composite.
    const consumerJob = ciJob(ci, "consumer-compat");
    expect(consumerJob).toContain("uses: ./.github/actions/ci-content-hash-restore");
    expect(consumerJob).toContain("execution: consumer");
    expect(consumerJob).toContain("matrix_node:");
    expect(consumerJob).toContain("matrix_pm:");
    expect(consumerJob).toContain("matrix_svelte:");
    expect(consumerJob).toContain("runtime_node_version:");
    expect(consumerJob).toContain("runtime_pm_version:");
    expect(consumerJob).toContain("node -v");
    expect(consumerJob).toContain("uses: ./.github/actions/ci-content-hash-write");

    // Marker jobs share the composite (not only unit). Split build keeps
    // independent content-hash executions so docs_site can cache-hit alone.
    for (const jobId of ["build", "svelte-check", "docs-site", "actions-security", "bench-smoke"]) {
      const slice = ciJob(ci, jobId);
      expect(slice.length, jobId).toBeGreaterThan(0);
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-write");
    }
    expect(ci).toContain("execution: svelte_check");
    expect(ci).toContain("execution: docs_site");
    // Concurrent: neither svelte-check nor docs-site waits on build.
    const orch = read(".github/workflows/ci.yml");
    const svelteOrch = orch.slice(orch.indexOf("  svelte-check:"), orch.indexOf("  docs-site:"));
    const docsOrch = orch.slice(orch.indexOf("  docs-site:"), orch.indexOf("  actions-security:"));
    expect(svelteOrch).toContain("needs: detect-changes");
    expect(svelteOrch).not.toContain("needs: [build");
    expect(docsOrch).toContain("needs: detect-changes");
    const docsSiteJob = ciJob(ci, "docs-site");
    expect(docsSiteJob).toContain("bun run build:docs");
    expect(docsSiteJob).toContain("bun run check:pages-links");
    // build job must still generate apps/docs/.svelte-kit before type-aware
    // (docs tsconfig extends it); sync used to come free via monlithic check:docs.
    const buildJob = ciJob(ci, "build");
    const syncAt = buildJob.indexOf("svelte-kit sync");
    const typeAwareAt = buildJob.indexOf("lint:type-aware");
    expect(syncAt).toBeGreaterThan(-1);
    expect(typeAwareAt).toBeGreaterThan(syncAt);

    // actions-security scans composites after extraction (zizmor path scope).
    const actionsSecurity = ciJob(ci, "actions-security");
    expect(actionsSecurity).toMatch(/zizmor==1\.26\.1 \.github\/workflows \.github\/actions/);

    // Router modules document invalidation + schema + composite recipe inputs.
    // Implementation lives under scripts/ci-routing/; the root file re-exports.
    const routing = read("scripts/ci-routing.ts");
    const contentHash = read("scripts/ci-routing/content-hash.ts");
    const pathRouting = read("scripts/ci-routing/routing.ts");
    expect(routing).toContain("CONTENT_HASH_SCHEMA");
    expect(routing).toContain("JOB_CONTENT_INPUTS");
    expect(contentHash).toContain("CONTENT_HASH_SCHEMA");
    expect(contentHash).toContain("JOB_CONTENT_INPUTS");
    expect(contentHash).toContain("CI_DISABLE_CONTENT_HASH");
    expect(contentHash).toContain(".github/actions/**");
    expect(pathRouting).toContain("ci_actions");
    expect(pathRouting).toContain("bypass_content_cache");
    expect(read("CONTRIBUTING.md")).toContain("content-hash");
  });

  it("enforces retained memory on path-routed bench-smoke CI jobs", () => {
    const ci = readCiSurface();
    expect(ci).toContain("bun run bench:memory:check");
    expect(ci).toContain("bench_smoke == 'true'");
  });

  it("path-routes CI jobs through scripts/ci-routing.ts and a ci-gate aggregator", () => {
    const ci = readCiSurface();
    // ci.yml and vr-compare both delegate path routing to the detect-changes
    // driver (shared resolveRouteInputs base resolution — issue #415).
    expect(ci).toContain("scripts/ci-routing.ts detect-changes");
    expect(ci).toContain("  detect-changes:");
    expect(ci).toContain("  ci-gate:");
    expect(ci).toContain("ci-gate (required aggregator)");
    expect(ci).toContain("DETECT_RESULT");
    // Fifteen routing outputs must stay wired for branch protection / needs.
    for (const out of [
      "checks:",
      "unit:",
      "component:",
      "consumer:",
      "build:",
      "svelte_check:",
      "docs_site:",
      "actions_security:",
      "bench_smoke:",
      "interaction_perf:",
      "packages_dist:",
      "vr:",
      "pages:",
      "docs_journeys:",
      "bypass_content_cache:",
    ]) {
      expect(ci, out).toContain(`      ${out}`);
    }
    // Checks job is pre-commit stage only (format/lint/guards). Heavy analysis
    // lives on dedicated CI jobs — never reintroduced via hook-stage pre-push.
    expect(ci).not.toContain("hook-stage pre-push");
    expect(ci).toContain("pre-commit run --all-files --show-diff-on-failure");
    expect(ci).toContain("bun run lint:type-aware");
    expect(ci).toContain("bun run knip");
    expect(read(".pre-commit-config.yaml")).not.toContain("pre-push");
    const vrCompare = read(".github/workflows/vr-compare.yml");
    // Shared base-resolution with ci.yml (issue #415) — no inline force-all bash.
    expect(vrCompare).toContain("scripts/ci-routing.ts detect-changes");
    expect(vrCompare).not.toContain("emit-github-output");
    expect(vrCompare).not.toContain('zero="0000000000000000000000000000000000000000"');
  });

  it("uses bash for the containerized visual approval job", () => {
    const workflow = read(".github/workflows/vr-compare.yml");
    const approvalJob = workflow.slice(workflow.indexOf("  approve-regenerate:"));
    expect(approvalJob).toContain("defaults:");
    expect(approvalJob).toContain("shell: bash");
  });

  it("scopes approve-regenerate to smoke VR screenshots only (#421)", () => {
    // Full-suite --update-snapshots fails on non-snapshot assertion tests and
    // permanently blocks baseline landing when any journey is red (see #421).
    const workflow = read(".github/workflows/vr-compare.yml");
    const approvalJob = workflow.slice(workflow.indexOf("  approve-regenerate:"));
    const nextJob = approvalJob.search(/\n  [a-zA-Z0-9_-]+:/);
    const job = nextJob === -1 ? approvalJob : approvalJob.slice(0, nextJob);
    expect(job).toContain("bun run test:visual -- vr.spec.ts --workers=1 --update-snapshots");
    // Must not reintroduce the full-suite regenerate command.
    expect(job).not.toMatch(/bun run test:visual -- --workers=1 --update-snapshots/);
    // approve-regenerate checks out the *approved PR's merge SHA*, which may
    // still contain the pre-move non-pixel scroll test in vr.spec.ts. Invert
    // that title so legacy render trees cannot block baseline upload.
    expect(job).toContain("--grep-invert 'preserves real page scrolling'");
    // Smoke file on main must stay screenshot-only (Codex P2 on #531).
    const smokeSpec = read("tests/visual/vr.spec.ts");
    expect(smokeSpec).not.toContain("without a golden");
    expect(smokeSpec).not.toContain("preserves real page scrolling");
    const journeysSpec = read("tests/visual/interaction-accessibility.spec.ts");
    expect(journeysSpec).toContain("preserves real page scrolling");
  });

  it("wires Dependabot for bun workspaces and GitHub Actions", () => {
    const dependabot = read(".github/dependabot.yml");
    expect(dependabot).toContain('package-ecosystem: "bun"');
    expect(dependabot).toContain('package-ecosystem: "github-actions"');
    // Monorepo manifests Dependabot should visit (single bun.lock at root).
    for (const directory of [
      '"/"',
      '"/packages/core"',
      '"/packages/spec"',
      '"/packages/svelte"',
      '"/apps/docs"',
      '"/examples"',
      '"/benchmarks"',
      '"/spikes/browser"',
      '"/spikes/pure"',
    ]) {
      expect(dependabot).toContain(directory);
    }
    // github-actions "/" only covers workflows; composites need their own dirs.
    expect(dependabot).toContain('"/.github/actions/ci-content-hash-restore"');
    expect(dependabot).toContain('"/.github/actions/ci-content-hash-write"');
    expect(dependabot).toContain('"/.github/actions/ci-setup-bun"');
    expect(dependabot).toContain('"/.github/actions/ci-bun-install"');
    expect(dependabot).toContain('"/.github/actions/ci-download-packages-dist"');
    expect(dependabot).toContain('"/.github/actions/ci-assert-playwright-version-sync"');
    // Human-authored locksteps / Changesets-owned internal ranges.
    expect(dependabot).toContain('dependency-name: "playwright"');
    expect(dependabot).toContain('dependency-name: "@playwright/test"');
    expect(dependabot).toContain('dependency-name: "pnpm"');
    expect(dependabot).toContain('dependency-name: "@ggsvelte/*"');
    // Action bumps group by dependency name across workflows + composites.
    expect(dependabot).toContain("github-actions:");
    expect(dependabot).toContain('patterns: ["*"]');
    expect(dependabot).toContain("group-by: dependency-name");
  });

  it("versions only publishable packages", () => {
    const config = JSON.parse(read(".changeset/config.json")) as {
      fixed?: string[][];
      linked?: string[][];
      privatePackages?: boolean | { version?: boolean; tag?: boolean };
    };
    expect(config.privatePackages).toBe(false);
    // fixed (not linked): any release bumps all three so package-identity
    // lockstep versions stay equal even when only one package has a changeset.
    expect(config.fixed).toEqual([["@ggsvelte/spec", "@ggsvelte/core", "@ggsvelte/svelte"]]);
    expect(config.linked ?? []).toEqual([]);
  });

  it("keeps internal dependencies installable in npm-published manifests", () => {
    for (const path of ["packages/core/package.json", "packages/svelte/package.json"]) {
      const manifest = JSON.parse(read(path)) as { dependencies?: Record<string, string> };
      for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
        if (!name.startsWith("@ggsvelte/")) continue;
        expect(range, `${path}: ${name} must be a registry semver range`).not.toStartWith(
          "workspace:",
        );
      }
    }
  });

  it("ships the CLI bin without npm manifest normalization", () => {
    const manifest = JSON.parse(read("packages/svelte/package.json")) as {
      bin?: Record<string, string>;
    };
    expect(manifest.bin).toEqual({
      "ggsvelte-render": "bin/ggsvelte-render.js",
    });
  });
});

it("thins expensive jobs on main push (issue #244)", () => {
  // Policy lives in detect-changes.ts after #393 extraction (not inline bash).
  const driver = read("scripts/ci-routing/detect-changes.ts");
  expect(driver).toContain("main push: thinned consumer/bench (issue #244)");
  expect(driver).toContain("applyMainPushThinning");
  expect(driver).toMatch(/consumer:\s*false/);
  expect(driver).toMatch(/bench_smoke:\s*false/);
  expect(driver).toMatch(/interaction_perf:\s*false/);
  // Must NOT force-off component/packages_dist on main (Codecov main badges).
  const thinFn = driver.slice(
    driver.indexOf("function applyMainPushThinning"),
    driver.indexOf("function applyRunCompat"),
  );
  expect(thinFn).not.toContain("component:");
  expect(thinFn).not.toContain("packages_dist:");
});

it("tiers the PR consumer matrix (issue #246)", () => {
  const ci = readCiSurface();
  const driver = read("scripts/ci-routing/detect-changes.ts");
  expect(ci).toContain("run-compat");
  expect(ci).toContain("flavor=pr");
  // Label must force consumer even when path routing would skip (Codex P2).
  expect(driver).toContain("run-compat: forced consumer + packages_dist");
  expect(driver).toContain("applyRunCompat");
  // Main push stays thinned per #244; full required is PR+label or nightly.
  expect(ci).not.toMatch(/full required[\s\S]{0,40}push\/main/i);
});

it("uses elastic hosted runners for PR correctness and visual checks", () => {
  const ci = readCiSurface();
  const vr = read(".github/workflows/vr-compare.yml");
  const bench = read(".github/workflows/bench.yml");
  const nightly = read(".github/workflows/compatibility-nightly.yml");
  const cancel = read(".github/workflows/cancel-on-pr-close.yml");

  // PR CI and VR must not regress to the four-slot repo-local pool. Optional,
  // hardware-sensitive benchmark and nightly workflows may remain self-hosted.
  for (const workflow of [ci, vr, bench, nightly]) {
    expect(heavyRunsOnCount(workflow)).toBe(0);
    expect(workflow).not.toContain("heavy-self-hosted-cpu");
  }
  expect(selfHostedGgsvelteCount(ci)).toBe(0);
  expect(selfHostedGgsvelteCount(vr)).toBe(0);
  expect(ci.match(/runs-on: ubuntu-latest/g)?.length).toBeGreaterThanOrEqual(16);
  expect(ci).toContain("runs-on: ${{ matrix.os }}");
  expect(vr.match(/runs-on: ubuntu-latest/g)?.length).toBeGreaterThanOrEqual(4);
  expect(selfHostedGgsvelteCount(bench)).toBe(1);
  expect(selfHostedGgsvelteCount(nightly)).toBeGreaterThanOrEqual(1);
  expect(ci).not.toContain("heavy-component");
  expect(ci).not.toContain("heavy-packages-dist");
  expect(ci).not.toContain("heavy-consumer-ubuntu");
  expect(ci).not.toContain("group: heavy-interaction-perf");
  // Superseded/closed work is still cancelled independently of runner choice.
  expect(ci).toMatch(/elastic pool|hosted|GitHub-hosted|ubuntu-latest/i);
  expect(ci).toContain("cancel-in-progress: true");
  expect(cancel).toContain("pull_request_target");
  expect(cancel).toContain("head_sha");
  // Bench: job-level concurrency so skip-only runs cannot cancel real work.
  expect(bench).toContain("group: bench-label-");
  expect(bench).not.toContain("gh-pages");
  expect(bench).not.toContain("github-action-benchmark");
});

it("binds approved baselines to a post-merge default-branch commit", () => {
  const compare = read(".github/workflows/vr-compare.yml");
  const approve = read(".github/workflows/vr-approve.yml");
  const checkout = approve.indexOf("checkout exact verified merged commit from base repo");

  for (const workflow of [compare, approve]) {
    expect(workflow).toContain(".merge_commit_sha");
    expect(workflow).toContain(".base.repo.full_name");
    expect(workflow).toContain(".base.ref");
    expect(workflow).toContain("default_branch");
    expect(workflow).toContain('comment_epoch="$(date -u -d');
    expect(workflow).toContain('merged_epoch="$(date -u -d');
    expect(workflow).toContain('if [ "${comment_epoch}" -le "${merged_epoch}" ]; then');
    expect(workflow).toContain("identical|ahead");
    expect(workflow).toContain('-f sha="${default_branch}"');
  }
  expect(compare).toContain("compare/${render_sha}...${default_sha}");
  expect(compare).toContain('render_repo="${REPO}"');
  expect(compare).not.toContain(".head.repo.full_name");
  expect(compare).toContain("source PR #${PR_NUMBER} is not merged");
  expect(compare).toContain("approval comment predates merge");
  expect(compare).toContain("ref: ${{ needs.approve-gate.outputs.render_sha }}");
  expect(approve).toContain("compare/${RENDER_SHA}...${default_sha}");
  expect(approve).toContain("artifact render is for ${RENDER_SHA}");
  expect(approve).toContain('if [ "${comment_epoch}" -le "${commit_epoch}" ]; then');
  expect(approve).toContain("ref: ${{ steps.verify.outputs.render_sha }}");
  expect(approve.indexOf('merged_at="$(printf')).toBeLessThan(checkout);

  const installAndGenerator = approve.slice(
    approve.indexOf("install dependencies at verified merged commit"),
    approve.indexOf("commit and push verified baselines to vr-update/pr-<n>"),
  );
  expect(installAndGenerator).toContain("bun install --frozen-lockfile");
  expect(installAndGenerator).toContain("bun scripts/gen-gallery-previews.ts");
  expect(installAndGenerator).not.toContain("GH_TOKEN:");
  expect(installAndGenerator).not.toContain("GITHUB_TOKEN:");
});

it("regenerates docs-owned gallery previews when approved baselines land", () => {
  const approve = read(".github/workflows/vr-approve.yml");
  const copy = approve.indexOf("find ../vr-artifact -name '*.png'");
  const generate = approve.indexOf("bun scripts/gen-gallery-previews.ts");
  const stage = approve.indexOf("git add tests/visual/__screenshots__ apps/docs/static/previews");

  expect(copy).toBeGreaterThan(-1);
  expect(generate).toBeGreaterThan(copy);
  expect(stage).toBeGreaterThan(generate);
  expect(approve).toContain("apps/docs/src/lib/generated/gallery-previews.ts");
});

it("opens the vr-update PR instead of stranding baselines on a branch (issue #717)", () => {
  const approve = read(".github/workflows/vr-approve.yml");

  // Least privilege: PR write is added for `gh pr create`, nothing else moves.
  expect(approve).toContain("pull-requests: write");
  expect(approve).toContain("contents: write");
  expect(approve).not.toContain("issues: write");

  // The decision itself lives in a unit-tested script, not in YAML shell.
  expect(approve).toContain("bun tools/scripts/vr-approve-decision.ts action");
  expect(approve).toContain("bun tools/scripts/vr-approve-decision.ts pr-create");
  // …run from the default branch, so recovering an old merged PR never depends
  // on the rendered commit predating this script.
  expect(approve).toContain("ref: ${{ github.event.repository.default_branch }}");
  expect(approve).toContain("sparse-checkout: scripts/vr-approve-decision.ts");

  // Open-PR existence is a fact the decision consumes, not a branch-tip guess.
  expect(approve).toContain("-f state=open");
  expect(approve).toContain('-f head="${REPO%%/*}:${branch}"');
  expect(approve).not.toContain('echo "skip=true"');

  // Render and the two PR-creation steps are gated on the script's verdicts.
  expect(approve).toContain("steps.decide.outputs.action == 'render'");
  expect(approve).toContain("steps.decide.outputs.action != 'skip'");
  expect(approve).toContain("steps.pr_decide.outputs.create == 'true'");
  expect(approve).toContain("gh pr create --repo");
  expect(approve).toContain('--head "${branch}"');
  expect(approve).toContain('--base "${DEFAULT_BRANCH}"');
  // A push that changed nothing must not claim a branch worth reviewing.
  expect(approve).toContain('echo "pushed=true"');
  expect(approve).toContain('echo "pushed=false"');

  const decide = approve.indexOf("bun tools/scripts/vr-approve-decision.ts action");
  const checkout = approve.indexOf("checkout exact verified merged commit from base repo");
  const push = approve.indexOf("commit and push verified baselines to vr-update/pr-<n>");
  const create = approve.indexOf("gh pr create --repo");
  expect(decide).toBeGreaterThan(-1);
  expect(checkout).toBeGreaterThan(decide);
  expect(create).toBeGreaterThan(push);
});

it("keeps the write credential out of every vr-approve step that runs repo code", () => {
  const approve = read(".github/workflows/vr-approve.yml");
  const steps = approve.split("\n      - name: ").slice(1);
  expect(steps.length).toBeGreaterThan(8);

  for (const step of steps) {
    const label = step.split("\n")[0];
    // The credential is *supplied* by an env assignment; a comment naming it
    // (the generator step explains its absence) is not the same thing.
    if (!/^\s+GH_TOKEN: /m.test(step)) continue;
    // Credentialed steps stay script-free: `gh`/`git` only, never repository
    // code from the checkout (invariant 1).
    expect(step, `credentialed step runs repo code: ${label}`).not.toMatch(/\brun: bun\b/);
    expect(step, `credentialed step runs repo code: ${label}`).not.toMatch(/\n\s+bun \S/);
  }

  const decideSteps = steps.filter((step) =>
    step.includes("bun tools/scripts/vr-approve-decision.ts"),
  );
  expect(decideSteps.length).toBe(2);
  for (const step of decideSteps) {
    expect(step).not.toContain("GH_TOKEN");
    expect(step).not.toContain("GITHUB_TOKEN");
  }
});

it("uses job-private Bun caches across CI workflows (issue #319)", () => {
  const workflows = [
    ".github/workflows/ci.yml",
    ".github/workflows/ci-unit.yml",
    ".github/workflows/ci-consumer.yml",
    ".github/workflows/ci-component-svelte.yml",
    ".github/workflows/vr-compare.yml",
    ".github/workflows/bench.yml",
    ".github/workflows/compatibility-nightly.yml",
    ".github/workflows/evals.yml",
  ];
  for (const path of workflows) {
    const workflow = read(path);
    const installs = workflow.match(/bun install --frozen-lockfile/g) ?? [];
    const fixtureInstalls = workflow.match(/run: bun scripts\/consumer-compat\.ts/g) ?? [];
    const privateCacheEnv =
      workflow.match(/BUN_INSTALL_CACHE_DIR: \$\{\{ runner\.temp \}\}\/bun-install-cache/g) ?? [];
    const privateCachePaths =
      workflow.match(/path: \$\{\{ runner\.temp \}\}\/bun-install-cache/g) ?? [];
    const bunCacheKeys = workflow.match(/key: bun-(?:container-)?\$\{\{ runner\.os \}\}/g) ?? [];
    expect(workflow, path).not.toContain("path: ~/.bun/install/cache");
    expect(privateCacheEnv.length, `${path}: every install gets a private cache`).toBe(
      installs.length + fixtureInstalls.length,
    );
    expect(privateCachePaths.length, `${path}: every Bun cache restore is private`).toBe(
      bunCacheKeys.length,
    );
  }

  // Shared install composite (ci.yml) must keep the private-cache protocol.
  const bunInstall = read(".github/actions/ci-bun-install/action.yml");
  expect(bunInstall).toContain("bun install --frozen-lockfile");
  expect(bunInstall).toContain("path: ${{ runner.temp }}/bun-install-cache");
  expect(bunInstall).toContain("BUN_INSTALL_CACHE_DIR: ${{ runner.temp }}/bun-install-cache");
  expect(bunInstall).not.toContain("path: ~/.bun/install/cache");

  // Consumer fixtures run their own package-manager install from a later step,
  // so that step must receive the cache env independently of the root install.
  for (const [path, start, end] of [
    [".github/workflows/ci-consumer.yml", "  consumer-compat:", ""],
    [".github/workflows/compatibility-nightly.yml", "  packed-consumer:", ""],
  ] as const) {
    const workflow = read(path);
    const jobStart = workflow.indexOf(start);
    const jobEnd = end.length > 0 ? workflow.indexOf(end, jobStart) : workflow.length;
    const job = workflow.slice(jobStart, jobEnd);
    const consumerRun = job.indexOf("run: bun scripts/consumer-compat.ts");
    const consumerStepStart = job.lastIndexOf("\n      - ", consumerRun);
    const consumerStep = job.slice(consumerStepStart, consumerRun);
    expect(consumerStep, `${path}: fixture install gets a private cache`).toContain(
      "BUN_INSTALL_CACHE_DIR: ${{ runner.temp }}/bun-install-cache",
    );
  }
});
