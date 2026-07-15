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
    const componentJob = ci.slice(ci.indexOf("  component:"), ci.indexOf("\n  build:"));
    expect(ci).toContain("mcr.microsoft.com/playwright:v1.61.1-noble");
    expect(ci).toContain("HOME: /root");
    expect(componentJob).toContain("name: build all packages for browser and docs targets");
    expect(componentJob).toContain("run: bun run build");
    expect(ci).toContain("bun run test:interaction-perf");
    expect(ci).toContain("interaction-accessibility.spec.ts");
    expect(bench).toContain("mcr.microsoft.com/playwright:v1.61.1-noble");
    expect(bench).toContain("bun run test:interaction-perf");
    expect(read("package.json")).toContain('"test:interaction-perf"');
    expect(read("tests/performance/interaction.spec.ts")).toContain("/__perf/interaction-100k");
    expect(read("apps/docs/src/routes/__perf/interaction-100k/+page.svelte")).toContain(
      "length: 100_000",
    );
  });

  it("enforces retained memory on every CI run", () => {
    expect(read(".github/workflows/ci.yml")).toContain("bun run bench:memory:check");
  });

  it("uses bash for the containerized visual approval job", () => {
    const workflow = read(".github/workflows/vr-compare.yml");
    const approvalJob = workflow.slice(workflow.indexOf("  approve-regenerate:"));
    expect(approvalJob).toContain("defaults:");
    expect(approvalJob).toContain("shell: bash");
  });

  it("versions only publishable packages", () => {
    const config = JSON.parse(read(".changeset/config.json")) as {
      privatePackages?: boolean | { version?: boolean; tag?: boolean };
    };
    expect(config.privatePackages).toBe(false);
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
