import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LANE_PATTERNS,
  classifyChangedPaths,
  docsPackageInvokedScripts,
  docsSourceScriptImports,
  listJobContentPaths,
  matchPathPattern,
  parseNameStatusList,
  planJobs,
} from "../ci-routing";

describe("matchPathPattern", () => {
  test("matches exact paths and directory prefixes", () => {
    expect(matchPathPattern("bun.lock", "bun.lock")).toBe(true);
    expect(matchPathPattern("bun.lock", "package.json")).toBe(false);
    expect(matchPathPattern("packages/spec/**", "packages/spec/src/index.ts")).toBe(true);
    expect(matchPathPattern("packages/spec/**", "packages/spec")).toBe(true);
    expect(matchPathPattern("packages/spec/**", "packages/core/src/x.ts")).toBe(false);
  });

  test("matches single-segment globs without crossing directories", () => {
    expect(matchPathPattern("tsconfig*.json", "tsconfig.json")).toBe(true);
    expect(matchPathPattern("tsconfig*.json", "tsconfig.base.json")).toBe(true);
    expect(matchPathPattern("tsconfig*.json", "packages/core/tsconfig.json")).toBe(false);
    // Domain reusable CI workflows (issue #392): basename wildcard under a fixed dir.
    expect(matchPathPattern(".github/workflows/ci-*.yml", ".github/workflows/ci-unit.yml")).toBe(
      true,
    );
    expect(matchPathPattern(".github/workflows/ci-*.yml", ".github/workflows/ci.yml")).toBe(false);
    expect(matchPathPattern(".github/workflows/ci-*.yml", ".github/workflows/vr-compare.yml")).toBe(
      false,
    );
  });
});

describe("classifyChangedPaths", () => {
  test("tags package, docs, workflow, lockfile, and visual lanes", () => {
    const flags = classifyChangedPaths([
      "packages/spec/src/validate.ts",
      "packages/core/src/render.ts",
      "packages/svelte/src/lib/Plot.svelte",
      "apps/docs/src/routes/+page.svelte",
      "examples/bar/stacked/Example.svelte",
      "benchmarks/pipeline.bench.ts",
      "scripts/ci-routing.ts",
      ".github/workflows/ci.yml",
      "tests/visual/vr.spec.ts",
      "bun.lock",
      "README.md",
    ]);
    expect(flags.spec).toBe(true);
    expect(flags.core).toBe(true);
    expect(flags.svelte).toBe(true);
    expect(flags.docs).toBe(true);
    expect(flags.examples).toBe(true);
    expect(flags.benchmarks).toBe(true);
    expect(flags.scripts).toBe(true);
    expect(flags.workflows).toBe(true);
    expect(flags.visual).toBe(true);
    expect(flags.lockfile).toBe(true);
    expect(flags.markdown).toBe(true);
  });

  test("worker sources sit on the workers lane only (issue #720)", () => {
    const flags = classifyChangedPaths([
      "workers/example-api/src/handler.ts",
      "workers/example-api/test/handler.test.ts",
      "workers/example-api/wrangler.toml",
    ]);
    expect(flags.workers).toBe(true);
    expect(flags.spec).toBe(false);
    expect(flags.core).toBe(false);
    expect(flags.svelte).toBe(false);
    expect(flags.docs).toBe(false);
    expect(flags.docs_render).toBe(false);
    expect(flags.scripts).toBe(false);
    expect(flags.visual).toBe(false);
  });

  test("docs-only prose does not flip package lanes", () => {
    const flags = classifyChangedPaths([
      "docs/decisions/0001-declaration-only-children.md",
      "CONTRIBUTING.md",
    ]);
    expect(flags.spec).toBe(false);
    expect(flags.core).toBe(false);
    expect(flags.svelte).toBe(false);
    expect(flags.docs).toBe(false);
    expect(flags.scripts).toBe(false);
    expect(flags.markdown).toBe(true);
    expect(flags.lockfile).toBe(false);
  });

  test("root README is a unit contract input (readme-showcase), not markdown-only", () => {
    const flags = classifyChangedPaths(["README.md"]);
    expect(flags.scripts).toBe(true);
    expect(flags.markdown).toBe(true);
    const plan = planJobs(flags);
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.vr).toBe(false);
  });

  test("llms module siblings stay on the docs lane (pages) without forcing VR", () => {
    for (const file of [
      "scripts/gen-llms.ts",
      "scripts/llms-diagnostic-docs.ts",
      "scripts/llms-lifecycle-docs.ts",
      "scripts/llms-markdown.ts",
      "scripts/llms-guide-content.ts",
      "scripts/llms-guide/getting-started.ts",
      "scripts/llms-guide/interactions.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      expect(flags.docs_render, file).toBe(false);
      const plan = planJobs(flags);
      expect(plan.pages, file).toBe(true);
      expect(plan.vr, file).toBe(false);
      expect(plan.docs_journeys, file).toBe(true);
      expect(plan.unit, file).toBe(true);
    }
  });

  test("guide content under apps/docs is content-only (docs, not docs_render)", () => {
    for (const file of [
      "apps/docs/src/lib/catalog/guide.ts",
      "apps/docs/src/lib/guide.ts",
      "apps/docs/src/lib/catalog/docs-tasks.ts",
      "apps/docs/src/lib/generated/routes.ts",
      "apps/docs/src/lib/generated/guide-navigation.ts",
      "apps/docs/src/lib/generated/search-index.ts",
      "apps/docs/src/lib/generated/gallery-previews.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      expect(flags.docs_render, file).toBe(false);
    }
  });

  test("guide-navigation projection schedules docs site without VR", () => {
    const path = "apps/docs/src/lib/generated/guide-navigation.ts";
    const plan = planJobs(classifyChangedPaths([path]));
    expect(plan.docs_site).toBe(true);
    expect(plan.svelte_check).toBe(true);
    expect(plan.docs_journeys).toBe(true);
    expect(plan.vr).toBe(false);
  });

  test("unknown apps/docs shell paths fail closed to docs_render", () => {
    for (const file of [
      "apps/docs/src/app.css",
      "apps/docs/src/styles/tokens.css",
      "apps/docs/src/lib/components/DocsShell.svelte",
      "apps/docs/src/routes/examples/[category]/[name]/+page.svelte",
      "apps/docs/src/routes/+layout.svelte",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      expect(flags.docs_render, file).toBe(true);
    }
  });
});

describe("parseNameStatusList", () => {
  test("includes both sides of renames and copies", () => {
    const paths = parseNameStatusList(
      [
        "M\tpackages/core/src/x.ts",
        "R100\tpackages/svelte/src/lib/Old.svelte\tapps/docs/src/lib/Old.svelte",
        "C050\tscripts/a.ts\tscripts/b.ts",
        "A\tscripts/new.ts",
      ].join("\n"),
    );
    expect(paths).toContain("packages/core/src/x.ts");
    expect(paths).toContain("packages/svelte/src/lib/Old.svelte");
    expect(paths).toContain("apps/docs/src/lib/Old.svelte");
    expect(paths).toContain("scripts/a.ts");
    expect(paths).toContain("scripts/b.ts");
    expect(paths).toContain("scripts/new.ts");
  });

  test("rename source keeps package surface when destination alone would not", () => {
    const files = parseNameStatusList(
      "R100\tpackages/svelte/src/lib/X.svelte\tdocs/notes/X.svelte\n",
    );
    const plan = planJobs(classifyChangedPaths(files));
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
  });
});

describe("docs surface membership gates (#784)", () => {
  test("docsPackageInvokedScripts parses bun script paths with and without flags", () => {
    expect(
      docsPackageInvokedScripts({
        build: "bun ../../scripts/gen-a.ts --check && bun ../../scripts/docs-csp.ts",
        check: "bun ../../scripts/gen-a.ts --check",
        dev: "vite dev",
      }),
    ).toEqual(["scripts/docs-csp.ts", "scripts/gen-a.ts"]);
  });

  test("docsSourceScriptImports resolves $scripts module ids to scripts/*.ts", () => {
    expect(
      docsSourceScriptImports(`
        import { x } from "$scripts/gen-llms";
        import type { Y } from "$scripts/cli-docs";
        import { z } from "$scripts/quickstart.ts";
      `),
    ).toEqual(["scripts/cli-docs.ts", "scripts/gen-llms.ts", "scripts/quickstart.ts"]);
  });

  test("every apps/docs package.json-invoked script is on the docs lane and docs surface hash", () => {
    const pkgPath = join(import.meta.dir, "..", "..", "apps", "docs", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts: Record<string, string>;
    };
    const invoked = docsPackageInvokedScripts(pkg.scripts);
    // Sanity: build/check must surface at least the known generators.
    expect(invoked).toContain("scripts/gen-docs-routes.ts");
    expect(invoked).toContain("scripts/docs-csp.ts");
    expect(invoked.length).toBeGreaterThan(4);

    for (const path of invoked) {
      // Membership via patterns (exact path or covered by a docs-lane pattern).
      const onDocsLane = LANE_PATTERNS.docs.some((pattern) => matchPathPattern(pattern, path));
      expect(onDocsLane, `LANE_PATTERNS.docs missing ${path}`).toBe(true);
      expect(classifyChangedPaths([path]).docs, path).toBe(true);
      // Invoked files (not their .test.ts siblings) must bust docs surface hashes.
      expect(listJobContentPaths("docs_site", [path]), `docs_site:${path}`).toContain(path);
      expect(listJobContentPaths("svelte_check", [path]), `svelte_check:${path}`).toContain(path);
    }
  });

  test("every $scripts import under apps/docs/src is on the docs lane and docs surface hash", () => {
    const root = join(import.meta.dir, "..", "..", "apps", "docs", "src");
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (/\.(ts|js|svelte)$/.test(entry.name)) sources.push(full);
      }
    };
    walk(root);

    const imported = new Set<string>();
    for (const file of sources) {
      for (const path of docsSourceScriptImports(readFileSync(file, "utf8"))) {
        imported.add(path);
      }
    }
    expect(imported.size).toBeGreaterThan(0);
    // Known $scripts consumers today.
    expect(imported).toContain("scripts/gen-llms.ts");
    expect(imported).toContain("scripts/docs-seo.ts");
    expect(imported).toContain("scripts/cli-docs.ts");

    for (const path of [...imported].toSorted()) {
      const onDocsLane = LANE_PATTERNS.docs.some((pattern) => matchPathPattern(pattern, path));
      expect(onDocsLane, `LANE_PATTERNS.docs missing $scripts import ${path}`).toBe(true);
      expect(listJobContentPaths("docs_site", [path]), `docs_site:${path}`).toContain(path);
      expect(listJobContentPaths("svelte_check", [path]), `svelte_check:${path}`).toContain(path);
    }
  });
});
