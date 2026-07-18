import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("R0 release wiring", () => {
  it("runs benchmark unit tests in CI and pre-push parity", () => {
    expect(read(".github/workflows/ci.yml")).toContain(
      "bun test packages/spec packages/core benchmarks scripts tests/evals",
    );
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
    // detect-changes exports bypass covering force-all / lockfile / ci.yml / router.
    const detect = ci.slice(ci.indexOf("  detect-changes:"), ci.indexOf("  packages-dist:"));
    expect(detect).toContain("bypass_content_cache:");
    expect(detect).toContain("emit-github-output");

    const producerJob = ci.slice(
      ci.indexOf("  packages-dist:\n    name: packages-dist"),
      ci.indexOf("  checks:\n    name: checks"),
    );
    expect(producerJob).toContain("hash-inputs --execution packages_dist");
    expect(producerJob).toContain(".packages-dist-cache");
    expect(producerJob).toContain("steps.restore_dist.outputs.hit != 'true'");
    expect(producerJob).toContain("stage content-hash cache payload");
    // Exact key only — no restore-keys on the content-hash cache step.
    const distCacheStep = producerJob.slice(
      producerJob.indexOf("restore packages-dist content-hash cache"),
      producerJob.indexOf("materialize packages/*/dist from content-hash cache"),
    );
    expect(distCacheStep).toContain("key: ${{ steps.content_hash.outputs.cache_key }}");
    expect(distCacheStep).not.toContain("restore-keys:");

    const unitJob = ci.slice(
      ci.indexOf("  unit:\n    name: unit"),
      ci.indexOf("  compatibility-matrix:\n    name: compatibility matrix"),
    );
    expect(unitJob).toContain("hash-inputs --execution unit");
    expect(unitJob).toContain("write-success-marker");
    expect(unitJob).toContain("validate-success-marker");
    expect(unitJob).toContain(".ci-content-hash/unit.ok");
    expect(unitJob).toContain("steps.validate_marker.outputs.hit != 'true'");
    expect(unitJob).toContain("bypass_content_cache");
    expect(unitJob).toContain("CI_DISABLE_CONTENT_HASH");

    // Distinct physical keys for component shards (Codex P1).
    for (const [job, execution] of [
      ["component-svelte", "component_svelte"],
      ["component-spikes", "component_spikes"],
      ["component-journeys", "component_journeys"],
    ] as const) {
      const start = ci.indexOf(`  ${job}:\n`);
      expect(start).toBeGreaterThan(-1);
      const slice = ci.slice(start, start + 4500);
      expect(slice).toContain(`hash-inputs --execution ${execution}`);
      expect(slice).toContain(`.ci-content-hash/${execution}.ok`);
      expect(slice).toContain("--container-tag");
    }

    // Consumer matrix dimensions are part of the cache key (Codex P1).
    const consumerJob = ci.slice(
      ci.indexOf("  consumer-compat:\n    name: packed consumer"),
      ci.indexOf("  component-svelte:\n    name: component-svelte"),
    );
    expect(consumerJob).toContain("hash-inputs --execution consumer");
    expect(consumerJob).toContain("--matrix-node");
    expect(consumerJob).toContain("--matrix-pm");
    expect(consumerJob).toContain("--matrix-svelte");
    expect(consumerJob).toContain(".ci-content-hash/consumer.ok");

    // Router module documents invalidation + schema.
    const routing = read("scripts/ci-routing.ts");
    expect(routing).toContain("CONTENT_HASH_SCHEMA");
    expect(routing).toContain("JOB_CONTENT_INPUTS");
    expect(routing).toContain("bypass_content_cache");
    expect(routing).toContain("CI_DISABLE_CONTENT_HASH");
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
  expect(ci).toContain("main push: thinned expensive jobs (issue #244)");
  expect(ci).toContain("packages_dist=false");
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

it("caps heavy self-hosted jobs with concurrency groups (issue #247)", () => {
  const ci = read(".github/workflows/ci.yml");
  // Required component shards share one group; informational perf is separate.
  expect(ci).toContain("group: heavy-component");
  expect(ci).toContain("group: heavy-interaction-perf");
  expect(ci).toContain("group: heavy-packages-dist");
  expect(ci).toContain("heavy-consumer-ubuntu");
  // Pending jobs queue instead of replacing each other (GitHub queue: max).
  expect(ci).toContain("queue: max");
  expect(ci).toContain("Heavy-job pool policy");
});
