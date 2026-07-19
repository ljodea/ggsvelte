import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const heavyGroupCount = (workflow: string) =>
  workflow
    .split("\n")
    .filter(
      (line) => line.trimStart().startsWith("group:") && line.includes("heavy-self-hosted-cpu"),
    ).length;

describe("R0 release wiring", () => {
  it("runs benchmark unit tests in CI and pre-push parity", () => {
    const ci = read(".github/workflows/ci.yml");
    // CI collects lcov for Codecov; pre-push stays plain (no coverage overhead).
    expect(ci).toContain("packages/spec packages/core benchmarks scripts tests/evals");
    expect(ci).toContain("--coverage-reporter=lcov");
    expect(ci).toContain("coverage/unit");
    expect(ci).toContain("codecov/codecov-action@");
    expect(ci).toContain("flags: unit");
    expect(ci).toContain("flags: svelte");
    expect(read("codecov.yml")).toContain("component_id: packages-spec");
    expect(read(".pre-commit-config.yaml")).toContain(
      "bun test packages/spec packages/core benchmarks scripts tests/evals",
    );
  });

  it("checks packed links in CI and the Pages deployment", () => {
    expect(read(".github/workflows/ci.yml")).toContain("bun run check:pages-links");
    expect(read(".github/workflows/pages.yml")).toContain("bun run check:pages-links");
  });

  it("runs the Playwright interaction performance gate with benchmark budgets", () => {
    const ci = read(".github/workflows/ci.yml");
    const bench = read(".github/workflows/bench.yml");
    // Issue #243: component surface is three parallel jobs (svelte / spikes / journeys).
    const svelteJob = ci.slice(
      ci.indexOf("  component-svelte:\n    name: component-svelte"),
      ci.indexOf("  component-spikes:\n    name: component-spikes"),
    );
    const spikesJob = ci.slice(
      ci.indexOf("  component-spikes:\n    name: component-spikes"),
      ci.indexOf("  component-journeys:\n    name: component-journeys"),
    );
    const journeysJob = ci.slice(
      ci.indexOf("  component-journeys:\n    name: component-journeys"),
      ci.indexOf("  interaction-perf:\n    name: interaction-perf"),
    );
    const interactionPerfJob = ci.slice(
      ci.indexOf("  interaction-perf:\n    name: interaction-perf"),
      ci.indexOf("  build:\n    name: build"),
    );
    expect(ci).toContain("mcr.microsoft.com/playwright:v1.61.1-noble");
    expect(ci).toContain("HOME: /root");
    // Each shard downloads shared packages/*/dist (issue #241); does not rebuild packages.
    for (const job of [svelteJob, spikesJob, journeysJob]) {
      expect(job).toContain("download-artifact");
      expect(job).toContain("packages-dist");
      expect(job).not.toContain("run: bun run build");
    }
    expect(svelteJob).toContain("working-directory: packages/svelte");
    expect(spikesJob).toContain("working-directory: spikes/browser");
    // Absolute wall-clock gates stay out of the required component surface
    // so multi-runner host noise cannot block merges (issue #154).
    expect(journeysJob).not.toContain("bun run test:interaction-perf");
    expect(journeysJob).toContain("interaction-accessibility.spec.ts");
    // ci-gate aggregates the three shards into the component routing flag.
    expect(ci).toContain("COMPONENT_SVELTE_RES");
    expect(ci).toContain("COMPONENT_SPIKES_RES");
    expect(ci).toContain("COMPONENT_JOURNEYS_RES");
    expect(interactionPerfJob).toContain("bun run test:interaction-perf");
    // Independent of component shards so it does not serialize the critical path;
    // still path-gated and informational (hard gate remains on run-bench).
    expect(interactionPerfJob).not.toContain("needs: [component]");
    expect(interactionPerfJob).toContain("informational");
    expect(interactionPerfJob).toContain("interaction_perf == 'true'");
    expect(interactionPerfJob).toContain("download-artifact");
    expect(interactionPerfJob).toContain("packages-dist");
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
    expect(producerJob).toContain("packages_dist == 'true'");
    expect(producerJob).toContain("if-no-files-found: error");
    expect(producerJob).toContain("packages/spec/dist");
    expect(producerJob).toContain("packages/core/dist");
    expect(producerJob).toContain("packages/svelte/dist");
    expect(producerJob).toContain("run: bun run build");
    // Consumers download instead of rebuilding packages.
    const consumerJob = ci.slice(
      ci.indexOf("  consumer-compat:\n    name: packed consumer"),
      ci.indexOf("  component-svelte:\n    name: component-svelte"),
    );
    expect(consumerJob).toContain("download-artifact");
    expect(consumerJob).toContain("packages-dist");
    expect(consumerJob).not.toContain("run: bun run build");
    // Unit and bench-smoke keep the cheaper bun run check path (Codex plan review).
    const unitJob = ci.slice(
      ci.indexOf("  unit:\n    name: unit"),
      ci.indexOf("  compatibility-matrix:\n    name: compatibility matrix"),
    );
    expect(unitJob).toContain("bun run check");
    expect(unitJob).not.toContain("download-artifact");
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

    // detect-changes exports bypass covering force-all / lockfile / ci.yml / router / actions.
    const detect = ci.slice(ci.indexOf("  detect-changes:"), ci.indexOf("  packages-dist:"));
    expect(detect).toContain("bypass_content_cache:");
    expect(detect).toContain("emit-github-output");

    // packages-dist keeps its specialized dist-payload protocol (not the marker composite).
    const producerJob = ci.slice(
      ci.indexOf("  packages-dist:\n    name: packages-dist"),
      ci.indexOf("  checks:\n    name: checks"),
    );
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

    const unitJob = ci.slice(
      ci.indexOf("  unit:\n    name: unit"),
      ci.indexOf("  compatibility-matrix:\n    name: compatibility matrix"),
    );
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
      ["component-spikes", "component_spikes"],
      ["component-journeys", "component_journeys"],
    ] as const) {
      const start = ci.indexOf(`  ${job}:\n`);
      expect(start).toBeGreaterThan(-1);
      const slice = ci.slice(start, start + 8000);
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(slice).toContain(`execution: ${execution}`);
      expect(slice).toContain("container_tag:");
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-write");
    }

    // Consumer: runtime resolution stays in the job; matrix dims pass into restore composite.
    const consumerJob = ci.slice(
      ci.indexOf("  consumer-compat:\n    name: packed consumer"),
      ci.indexOf("  component-svelte:\n    name: component-svelte"),
    );
    expect(consumerJob).toContain("uses: ./.github/actions/ci-content-hash-restore");
    expect(consumerJob).toContain("execution: consumer");
    expect(consumerJob).toContain("matrix_node:");
    expect(consumerJob).toContain("matrix_pm:");
    expect(consumerJob).toContain("matrix_svelte:");
    expect(consumerJob).toContain("runtime_node_version:");
    expect(consumerJob).toContain("runtime_pm_version:");
    expect(consumerJob).toContain("node -v");
    expect(consumerJob).toContain("uses: ./.github/actions/ci-content-hash-write");

    // Marker jobs share the composite (not only unit).
    for (const jobMarker of [
      "  build:\n    name: build",
      "  actions-security:\n    name: actions-security",
      "  bench-smoke:\n    name: bench-smoke",
    ]) {
      const start = ci.indexOf(jobMarker);
      expect(start).toBeGreaterThan(-1);
      const slice = ci.slice(start, start + 3500);
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-restore");
      expect(slice).toContain("uses: ./.github/actions/ci-content-hash-write");
    }

    // actions-security scans composites after extraction (zizmor path scope).
    const actionsSecurity = ci.slice(
      ci.indexOf("  actions-security:\n    name: actions-security"),
      ci.indexOf("  bench-smoke:\n    name: bench-smoke"),
    );
    expect(actionsSecurity).toMatch(/zizmor==1\.26\.1 \.github\/workflows \.github\/actions/);

    // Router module documents invalidation + schema + composite recipe inputs.
    const routing = read("scripts/ci-routing.ts");
    expect(routing).toContain("CONTENT_HASH_SCHEMA");
    expect(routing).toContain("JOB_CONTENT_INPUTS");
    expect(routing).toContain("bypass_content_cache");
    expect(routing).toContain("CI_DISABLE_CONTENT_HASH");
    expect(routing).toContain(".github/actions/**");
    expect(routing).toContain("ci_actions");
    expect(read("CONTRIBUTING.md")).toContain("content-hash");
  });

  it("enforces retained memory on path-routed bench-smoke CI jobs", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("bun run bench:memory:check");
    expect(ci).toContain("bench_smoke == 'true'");
  });

  it("path-routes CI jobs through scripts/ci-routing.ts and a ci-gate aggregator", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("scripts/ci-routing.ts emit-github-output");
    expect(ci).toContain("  detect-changes:");
    expect(ci).toContain("  ci-gate:");
    // Pre-push mega-suite must not double-run on the checks job.
    expect(ci).not.toContain("hook-stage pre-push");
    expect(ci).toContain("pre-commit run --all-files --show-diff-on-failure");
    // Static analysis formerly on pre-push now lives on the build job.
    expect(ci).toContain("bun run lint:type-aware");
    expect(ci).toContain("bun run knip");
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
  const ci = read(".github/workflows/ci.yml");
  // Consumer/bench stay PR-primary; packages_dist+component remain path-routed
  // so Codecov can refresh packages/svelte coverage on main.
  expect(ci).toContain("main push: thinned consumer/bench (issue #244)");
  expect(ci).toContain('echo "consumer=false"');
  expect(ci).toContain('echo "bench_smoke=false"');
  expect(ci).toContain('echo "interaction_perf=false"');
  // Must NOT force-off component/packages_dist on main (Codecov main badges).
  const mainThin = ci.slice(
    ci.indexOf("main push: thinned consumer/bench"),
    ci.indexOf("main push: thinned consumer/bench") + 400,
  );
  expect(mainThin).not.toContain("component=false");
  expect(mainThin).not.toContain("packages_dist=false");
});

it("tiers the PR consumer matrix (issue #246)", () => {
  const ci = read(".github/workflows/ci.yml");
  expect(ci).toContain("run-compat");
  expect(ci).toContain("flavor=pr");
  // Label must force consumer even when path routing would skip (Codex P2).
  expect(ci).toContain("run-compat: forced consumer + packages_dist");
  // Main push stays thinned per #244; full required is PR+label or nightly.
  expect(ci).not.toMatch(/full required[\s\S]{0,40}push\/main/i);
});

it("caps aggregate heavy self-hosted work across workflows (issues #247 and #319)", () => {
  const ci = read(".github/workflows/ci.yml");
  const vr = read(".github/workflows/vr-compare.yml");
  const pages = read(".github/workflows/pages.yml");
  const bench = read(".github/workflows/bench.yml");
  const nightly = read(".github/workflows/compatibility-nightly.yml");

  // One repo-wide group is the aggregate mutex. Category-specific groups let
  // browser, build, and benchmark jobs starve each other on the same host.
  expect(heavyGroupCount(ci)).toBe(8);
  expect(heavyGroupCount(vr)).toBe(2);
  expect(heavyGroupCount(pages)).toBe(1);
  expect(heavyGroupCount(bench)).toBe(1);
  expect(heavyGroupCount(nightly)).toBe(1);
  expect(ci).not.toContain("heavy-component");
  expect(ci).not.toContain("heavy-packages-dist");
  expect(ci).not.toContain("heavy-consumer-ubuntu");
  // Informational performance work is still CPU-heavy: leaving it outside the
  // mutex can starve the required browser and memory gates it runs beside.
  expect(ci).not.toContain("group: heavy-interaction-perf");
  // Pending jobs queue instead of replacing each other (GitHub queue: max).
  for (const workflow of [ci, vr, pages, bench, nightly]) expect(workflow).toContain("queue: max");
  expect(ci).toContain("Heavy-job pool policy");
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
    const installs = workflow.match(/bun install --frozen-lockfile/g) ?? [];
    const privateCacheEnv =
      workflow.match(/BUN_INSTALL_CACHE_DIR: \$\{\{ runner\.temp \}\}\/bun-install-cache/g) ?? [];
    const privateCachePaths =
      workflow.match(/path: \$\{\{ runner\.temp \}\}\/bun-install-cache/g) ?? [];
    const bunCacheKeys = workflow.match(/key: bun-(?:container-)?\$\{\{ runner\.os \}\}/g) ?? [];
    expect(workflow, path).not.toContain("path: ~/.bun/install/cache");
    expect(privateCacheEnv.length, `${path}: every install gets a private cache`).toBe(
      installs.length,
    );
    expect(privateCachePaths.length, `${path}: every Bun cache restore is private`).toBe(
      bunCacheKeys.length,
    );
  }
});
