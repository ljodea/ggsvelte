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
