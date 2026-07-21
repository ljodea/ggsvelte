import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
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
const jobAction = (jobId: string) => read(`.github/actions/ci-job-${jobId}/action.yml`);

describe("R0 release wiring", () => {
  it("runs benchmark unit tests in CI and pre-push parity", () => {
    const ci = read(".github/workflows/ci.yml");
    const unit = jobAction("unit");
    const svelte = jobAction("component-svelte");
    // CI collects lcov for Codecov; pre-push stays plain (no coverage overhead).
    expect(unit).toContain("packages/spec packages/core benchmarks scripts tests/evals");
    expect(unit).toContain("--coverage-reporter=lcov");
    expect(unit).toContain("coverage/unit");
    expect(unit).toContain("codecov/codecov-action@");
    expect(unit).toContain("flags: unit");
    expect(svelte).toContain("flags: svelte");
    expect(ci).toContain("uses: ./.github/actions/ci-job-unit");
    expect(read("codecov.yml")).toContain("component_id: packages-spec");
    expect(read(".pre-commit-config.yaml")).toContain(
      "bun test packages/spec packages/core benchmarks scripts tests/evals",
    );
  });

  it("checks packed links in CI and the Pages deployment", () => {
    expect(jobAction("docs-site")).toContain("bun run check:pages-links");
    expect(read(".github/workflows/pages.yml")).toContain("bun run check:pages-links");
  });

  it("runs the Playwright interaction performance gate with benchmark budgets", () => {
    const ci = read(".github/workflows/ci.yml");
    const bench = read(".github/workflows/bench.yml");
    // Browser surface: svelte + spikes (component). Journeys is docs_journeys-routed.
    // Step bodies live in ci-job-* composites; job topology stays in ci.yml.
    const svelteBody = jobAction("component-svelte");
    const spikesBody = jobAction("component-spikes");
    const journeysBody = jobAction("component-journeys");
    const journeysJob = ci.slice(
      ci.indexOf("  component-journeys:"),
      ci.indexOf("  interaction-perf:"),
    );
    const interactionPerfJob = ci.slice(
      ci.indexOf("  interaction-perf:"),
      ci.indexOf("  build:\n    name: build (packages"),
    );
    const interactionPerfBody = jobAction("interaction-perf");
    expect(ci).toContain("mcr.microsoft.com/playwright:v1.61.1-noble");
    expect(ci).toContain("HOME: /root");
    // Package browser shards download packages/*/dist (issue #241); no monorepo rebuild.
    for (const body of [svelteBody, spikesBody]) {
      expect(body).toContain("uses: ./.github/actions/ci-download-packages-dist");
      expect(body).toContain("packages-dist");
      expect(body).not.toContain("run: bun run build\n");
    }
    expect(svelteBody).toContain("working-directory: packages/svelte");
    expect(spikesBody).toContain("working-directory: spikes/browser");
    // Journeys: docs_journeys routing + full non-pixel inventory; may build docs site.
    expect(journeysJob).toContain("docs_journeys == 'true'");
    expect(journeysBody).toContain("uses: ./.github/actions/ci-download-packages-dist");
    expect(journeysBody).toContain("packages-dist");
    expect(journeysBody).toContain("bun run build:docs");
    expect(journeysBody).not.toContain("bun run test:interaction-perf");
    expect(journeysBody).toContain("interaction-accessibility.spec.ts");
    expect(journeysBody).toContain("docs-home-gallery.spec.ts");
    expect(journeysBody).toContain("docs-progressive-search.spec.ts");
    expect(journeysBody).toContain("docs-themes.spec.ts");
    expect(journeysBody).toContain("--grep-invert 'visual contract'");
    // ci-gate: package component = svelte+spikes; docs_journeys is independent.
    const gate = jobAction("ci-gate") + read("scripts/ci-gate.ts");
    expect(gate).toContain("COMPONENT_SVELTE_RES");
    expect(gate).toContain("COMPONENT_SPIKES_RES");
    expect(gate).toContain("DOCS_JOURNEYS_RES");
    expect(ci).toContain("docs_journeys_req:");
    expect(ci).toContain("docs_journeys:");
    expect(interactionPerfBody).toContain("bun run test:interaction-perf");
    // Independent of component shards so it does not serialize the critical path;
    // still path-gated and informational (hard gate remains on run-bench).
    expect(interactionPerfJob).not.toContain("needs: [component]");
    expect(interactionPerfJob).toContain("informational");
    expect(interactionPerfJob).toContain("interaction_perf == 'true'");
    expect(interactionPerfBody).toContain("uses: ./.github/actions/ci-download-packages-dist");
    expect(interactionPerfBody).toContain("packages-dist");
    expect(bench).toContain("mcr.microsoft.com/playwright:v1.61.1-noble");
    expect(bench).toContain("bun run test:interaction-perf");
    expect(read("package.json")).toContain('"test:interaction-perf"');
    expect(read("tests/performance/interaction.spec.ts")).toContain("/__perf/interaction-100k");
    expect(read("apps/docs/src/routes/__perf/interaction-100k/+page.svelte")).toContain(
      "length: 100_000",
    );
  });

  it("shares packages/*/dist via a packages-dist producer job (issue #241)", () => {
    const ci = read(".github/workflows/ci.yml");
    const producerJob = ci.slice(
      ci.indexOf("  packages-dist:\n    name: packages-dist"),
      ci.indexOf("  checks:\n    name: checks"),
    );
    const producerBody = jobAction("packages-dist");
    expect(producerJob).toContain("packages_dist == 'true'");
    expect(producerJob).toContain("uses: ./.github/actions/ci-job-packages-dist");
    expect(producerBody).toContain("if-no-files-found: error");
    expect(producerBody).toContain("packages/spec/dist");
    expect(producerBody).toContain("packages/core/dist");
    expect(producerBody).toContain("packages/svelte/dist");
    expect(producerBody).toContain("run: bun run build");
    // Consumers download instead of rebuilding packages (via composite).
    const consumerBody = jobAction("consumer-compat");
    expect(consumerBody).toContain("uses: ./.github/actions/ci-download-packages-dist");
    expect(consumerBody).toContain("packages-dist");
    expect(consumerBody).not.toContain("run: bun run build");
    // Unit and bench-smoke keep the cheaper bun run check path (Codex plan review).
    const unitBody = jobAction("unit");
    expect(unitBody).toContain("bun run check");
    expect(unitBody).not.toContain("download-artifact");
  });

  it("content-hash skips scheduled jobs via physical execution keys (issue #245)", () => {
    const ci = read(".github/workflows/ci.yml");
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

    // detect-changes exports bypass; routing body lives in scripts/ci-detect-changes.sh.
    const detect = ci.slice(ci.indexOf("  detect-changes:"), ci.indexOf("  packages-dist:"));
    expect(detect).toContain("bypass_content_cache:");
    expect(detect).toContain("scripts/ci-detect-changes.sh");
    expect(read("scripts/ci-detect-changes.sh")).toContain("emit-github-output");

    // packages-dist keeps its specialized dist-payload protocol (not the marker composite).
    const producerBody = jobAction("packages-dist");
    expect(producerBody).toContain("hash-inputs --execution packages_dist");
    expect(producerBody).toContain(".packages-dist-cache");
    expect(producerBody).toContain("steps.restore_dist.outputs.hit != 'true'");
    expect(producerBody).toContain("stage content-hash cache payload");
    const distCacheStep = producerBody.slice(
      producerBody.indexOf("restore packages-dist content-hash cache"),
      producerBody.indexOf("materialize packages/*/dist from content-hash cache"),
    );
    expect(distCacheStep).toContain("key: ${{ steps.content_hash.outputs.cache_key }}");
    expect(distCacheStep).not.toContain("restore-keys:");
    expect(producerBody).not.toContain("ci-content-hash-restore");

    const unitJob = ci.slice(
      ci.indexOf("  unit:\n    name: unit"),
      ci.indexOf("  compatibility-matrix:\n    name: compatibility matrix"),
    );
    const unitBody = jobAction("unit");
    expect(unitBody).toContain("uses: ./.github/actions/ci-content-hash-restore");
    expect(unitBody).toContain("uses: ./.github/actions/ci-content-hash-write");
    expect(unitBody).toContain("execution: unit");
    expect(unitBody).toContain("steps.content_hash.outputs.hit != 'true'");
    expect(unitJob).toContain("bypass_content_cache");
    expect(unitJob).toContain("CI_DISABLE_CONTENT_HASH");

    // Distinct physical keys for component shards (Codex P1).
    for (const [job, execution] of [
      ["component-svelte", "component_svelte"],
      ["component-spikes", "component_spikes"],
      ["component-journeys", "component_journeys"],
    ] as const) {
      const body = jobAction(job);
      expect(body).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(body).toContain(`execution: ${execution}`);
      expect(body).toContain("container_tag:");
      expect(body).toContain("uses: ./.github/actions/ci-content-hash-write");
    }

    // Consumer: runtime resolution + matrix dims in job-body composite.
    const consumerBody = jobAction("consumer-compat");
    expect(consumerBody).toContain("uses: ./.github/actions/ci-content-hash-restore");
    expect(consumerBody).toContain("execution: consumer");
    expect(consumerBody).toContain("matrix_node:");
    expect(consumerBody).toContain("matrix_pm:");
    expect(consumerBody).toContain("matrix_svelte:");
    expect(consumerBody).toContain("runtime_node_version:");
    expect(consumerBody).toContain("runtime_pm_version:");
    expect(consumerBody).toContain("node -v");
    expect(consumerBody).toContain("uses: ./.github/actions/ci-content-hash-write");

    // Marker jobs share the composite (not only unit). Split build keeps
    // independent content-hash executions so docs_site can cache-hit alone.
    for (const jobId of ["build", "svelte-check", "docs-site", "actions-security", "bench-smoke"]) {
      const body = jobAction(jobId);
      expect(body).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(body).toContain("uses: ./.github/actions/ci-content-hash-write");
    }
    expect(jobAction("svelte-check")).toContain("execution: svelte_check");
    expect(jobAction("docs-site")).toContain("execution: docs_site");
    // Concurrent: neither svelte-check nor docs-site waits on build.
    const svelteCheckJob = ci.slice(
      ci.indexOf("  svelte-check:\n    name: svelte-check"),
      ci.indexOf("  docs-site:\n    name: docs-site"),
    );
    const docsSiteJob = ci.slice(
      ci.indexOf("  docs-site:\n    name: docs-site"),
      ci.indexOf("  actions-security:\n    name: actions-security"),
    );
    expect(svelteCheckJob).toContain("needs: detect-changes");
    expect(svelteCheckJob).not.toContain("needs: [build");
    expect(docsSiteJob).toContain("needs: detect-changes");
    expect(jobAction("docs-site")).toContain("bun run build:docs");
    expect(jobAction("docs-site")).toContain("bun run check:pages-links");
    // build job must still generate apps/docs/.svelte-kit before type-aware
    // (docs tsconfig extends it); sync used to come free via monlithic check:docs.
    const buildBody = jobAction("build");
    const syncAt = buildBody.indexOf("svelte-kit sync");
    const typeAwareAt = buildBody.indexOf("lint:type-aware");
    expect(syncAt).toBeGreaterThan(-1);
    expect(typeAwareAt).toBeGreaterThan(syncAt);

    // actions-security scans composites after extraction (zizmor path scope).
    expect(jobAction("actions-security")).toMatch(
      /zizmor==1\.26\.1 \.github\/workflows \.github\/actions/,
    );

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
    const ci = read(".github/workflows/ci.yml");
    expect(jobAction("bench-smoke")).toContain("bun run bench:memory:check");
    expect(ci).toContain("bench_smoke == 'true'");
  });

  it("path-routes CI jobs through scripts/ci-routing.ts and a ci-gate aggregator", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(read("scripts/ci-detect-changes.sh")).toContain(
      "scripts/ci-routing.ts emit-github-output",
    );
    expect(ci).toContain("scripts/ci-detect-changes.sh");
    expect(ci).toContain("  detect-changes:");
    expect(ci).toContain("  ci-gate:");
    // Pre-push mega-suite must not double-run on the checks job.
    expect(ci).not.toContain("hook-stage pre-push");
    expect(jobAction("checks")).toContain("pre-commit run --all-files --show-diff-on-failure");
    // Static analysis formerly on pre-push now lives on the build job.
    expect(jobAction("build")).toContain("bun run lint:type-aware");
    expect(jobAction("build")).toContain("bun run knip");
    expect(read(".github/workflows/pages.yml")).toContain(
      "scripts/ci-routing.ts emit-github-output",
    );
    expect(read(".github/workflows/vr-compare.yml")).toContain(
      "scripts/ci-routing.ts emit-github-output",
    );
  });

  it("uses bash for the containerized visual approval job", () => {
    const workflow = read(".github/workflows/vr-compare.yml");
    const approvalJob = workflow.slice(workflow.indexOf("  approve-regenerate:"));
    expect(approvalJob).toContain("defaults:");
    expect(approvalJob).toContain("shell: bash");
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
      linked?: string[][];
      privatePackages?: boolean | { version?: boolean; tag?: boolean };
    };
    expect(config.privatePackages).toBe(false);
    expect(config.linked).toEqual([["@ggsvelte/spec", "@ggsvelte/core", "@ggsvelte/svelte"]]);
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
  // Thinning lives in scripts/ci-detect-changes.sh (detect-changes job driver).
  const detect = read("scripts/ci-detect-changes.sh");
  // Consumer/bench stay PR-primary; packages_dist+component remain path-routed
  // so Codecov can refresh packages/svelte coverage on main.
  expect(detect).toContain("main push: thinned consumer/bench (issue #244)");
  expect(detect).toContain('echo "consumer=false"');
  expect(detect).toContain('echo "bench_smoke=false"');
  expect(detect).toContain('echo "interaction_perf=false"');
  // Must NOT force-off component/packages_dist on main (Codecov main badges).
  const mainThin = detect.slice(
    detect.indexOf("main push: thinned consumer/bench"),
    detect.indexOf("main push: thinned consumer/bench") + 400,
  );
  expect(mainThin).not.toContain("component=false");
  expect(mainThin).not.toContain("packages_dist=false");
});

it("tiers the PR consumer matrix (issue #246)", () => {
  const ci = read(".github/workflows/ci.yml");
  const detect = read("scripts/ci-detect-changes.sh");
  const matrix = jobAction("compatibility-matrix");
  expect(ci).toContain("run-compat");
  expect(matrix).toContain("flavor=pr");
  // Label must force consumer even when path routing would skip (Codex P2).
  expect(detect).toContain("run-compat: forced consumer + packages_dist");
  // Main push stays thinned per #244; full required is PR+label or nightly.
  expect(matrix).not.toMatch(/full required[\s\S]{0,40}push\/main/i);
});

it("uses one self-hosted ggsvelte pool (no heavy/light label split)", () => {
  const ci = read(".github/workflows/ci.yml");
  const vr = read(".github/workflows/vr-compare.yml");
  const pages = read(".github/workflows/pages.yml");
  const bench = read(".github/workflows/bench.yml");
  const nightly = read(".github/workflows/compatibility-nightly.yml");
  const cancel = read(".github/workflows/cancel-on-pr-close.yml");

  // Single-label pool: every self-hosted Linux job uses `ggsvelte` only.
  // Dual-label scheduling was theater; the old 2-slot heavy-only pool was the
  // real bottleneck (issues #247, #319, #321). Comments may mention the retired
  // label when explaining history — assert on runs-on lines only.
  for (const workflow of [ci, vr, pages, bench, nightly]) {
    expect(heavyRunsOnCount(workflow)).toBe(0);
    expect(workflow).not.toContain("heavy-self-hosted-cpu");
  }
  expect(selfHostedGgsvelteCount(ci)).toBeGreaterThanOrEqual(10);
  expect(selfHostedGgsvelteCount(vr)).toBe(3);
  expect(selfHostedGgsvelteCount(pages)).toBe(2);
  expect(selfHostedGgsvelteCount(bench)).toBe(1);
  expect(selfHostedGgsvelteCount(nightly)).toBeGreaterThanOrEqual(1);
  expect(ci).not.toContain("heavy-component");
  expect(ci).not.toContain("heavy-packages-dist");
  expect(ci).not.toContain("heavy-consumer-ubuntu");
  expect(ci).not.toContain("group: heavy-interaction-perf");
  // Documented live topology + cancel-on-close (not label fiction).
  expect(ci).toContain("four cpuset-isolated runners");
  expect(ci).toContain("cancel-in-progress: true");
  expect(cancel).toContain("pull_request_target");
  expect(cancel).toContain("head_sha");
  // Pages/Bench: job-level concurrency so skip-only runs cannot cancel real work.
  expect(pages).toContain("group: pages-build-");
  expect(pages).not.toMatch(/^concurrency:\s*$/m);
  expect(bench).toContain("group: bench-label-");
  expect(bench).toContain("group: bench-trend-");
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

it("uses job-private Bun caches in self-hosted workflows (issue #319)", () => {
  const workflows = [
    ".github/workflows/ci.yml",
    ".github/workflows/vr-compare.yml",
    ".github/workflows/pages.yml",
    ".github/workflows/bench.yml",
    ".github/workflows/compatibility-nightly.yml",
    ".github/workflows/evals.yml",
  ];
  for (const path of workflows) {
    const workflow = read(path);
    // ci.yml installs live in job-body / step composites — scan those too.
    const sources =
      path === ".github/workflows/ci.yml"
        ? [
            workflow,
            read(".github/actions/ci-bun-install/action.yml"),
            jobAction("consumer-compat"),
          ]
        : [workflow];
    const blob = sources.join("\n");
    // Count only run-step installs (not composite description prose).
    const installs = blob.match(/^\s*-?\s*run:\s*bun install --frozen-lockfile\s*$/gm) ?? [];
    const fixtureInstalls = blob.match(/run: bun scripts\/consumer-compat\.ts/g) ?? [];
    const privateCacheEnv =
      blob.match(/BUN_INSTALL_CACHE_DIR: \$\{\{ runner\.temp \}\}\/bun-install-cache/g) ?? [];
    const privateCachePaths =
      blob.match(/path: \$\{\{ runner\.temp \}\}\/bun-install-cache/g) ?? [];
    // Cache keys may use ${{ inputs.cache_key_prefix }} or literal bun-/bun-container-.
    const bunCacheKeys =
      blob.match(
        /key:\s*(?:bun-(?:container-)?|\$\{\{\s*inputs\.cache_key_prefix\s*\}\}-)\$\{\{\s*runner\.os\s*\}\}/g,
      ) ?? [];
    expect(blob, path).not.toContain("path: ~/.bun/install/cache");
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
  const consumerBodies = [
    jobAction("consumer-compat"),
    (() => {
      const workflow = read(".github/workflows/compatibility-nightly.yml");
      const jobStart = workflow.indexOf("  packed-consumer:");
      return workflow.slice(jobStart);
    })(),
  ];
  for (const body of consumerBodies) {
    const consumerRun = body.indexOf("run: bun scripts/consumer-compat.ts");
    expect(consumerRun).toBeGreaterThan(-1);
    // Walk back to the step that owns this run (list item may be "    - " or "      - ").
    const before = body.slice(0, consumerRun);
    const consumerStepStart = Math.max(
      before.lastIndexOf("\n    - "),
      before.lastIndexOf("\n      - "),
    );
    const consumerStep = body.slice(consumerStepStart, consumerRun);
    expect(consumerStep).toContain("BUN_INSTALL_CACHE_DIR: ${{ runner.temp }}/bun-install-cache");
  }
});
