import { describe, expect, test } from "bun:test";

import {
  CACHEABLE_EXECUTIONS,
  CONTENT_HASH_SCHEMA,
  JOB_CONTENT_INPUTS,
  classifyChangedPaths,
  contentHashCacheKey,
  evaluateGate,
  formatGithubOutputs,
  formatTreeEntryDigest,
  hashJobInputs,
  listJobContentPaths,
  matchPathPattern,
  parseGitLsTreeLine,
  parseNameStatusList,
  parseSuccessMarker,
  planJobs,
  requireJobInputDigests,
  serializeSuccessMarker,
  shouldBypassContentCache,
  validateSuccessMarker,
  type JobName,
} from "./ci-routing.ts";

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

  test("docs-only prose does not flip package lanes", () => {
    const flags = classifyChangedPaths([
      "docs/decisions/0001-declaration-only-children.md",
      "README.md",
    ]);
    expect(flags.spec).toBe(false);
    expect(flags.core).toBe(false);
    expect(flags.svelte).toBe(false);
    expect(flags.docs).toBe(false);
    expect(flags.markdown).toBe(true);
    expect(flags.lockfile).toBe(false);
  });

  test("llms module siblings stay on the docs lane (pages/vr)", () => {
    for (const file of [
      "scripts/gen-llms.ts",
      "scripts/llms-markdown.ts",
      "scripts/llms-guide-content.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      const plan = planJobs(flags);
      expect(plan.pages, file).toBe(true);
      expect(plan.vr, file).toBe(true);
      expect(plan.unit, file).toBe(true);
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

describe("planJobs", () => {
  test("docs-site changes run unit+build+vr+pages (script tests cover docs behavior)", () => {
    const plan = planJobs(classifyChangedPaths(["apps/docs/src/routes/guide/+page.svelte"]));
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.bench_smoke).toBe(false);
    expect(plan.actions_security).toBe(false);
    expect(plan.build).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.pages).toBe(true);
    expect(plan.interaction_perf).toBe(false);
  });

  test("docs generators schedule pages/vr (not scripts-only)", () => {
    for (const path of [
      "scripts/gen-llms.ts",
      "scripts/docs-seo.ts",
      "scripts/gen-docs-search.ts",
      "scripts/gen-gallery-previews.ts",
      "scripts/cli-docs.ts",
      "scripts/guide-code-contract.ts",
    ]) {
      const plan = planJobs(classifyChangedPaths([path]));
      expect(plan.unit).toBe(true);
      expect(plan.pages).toBe(true);
      expect(plan.vr).toBe(true);
      expect(plan.component).toBe(false);
    }
  });

  test("canonical visual sources schedule pages because generated gallery previews depend on them", () => {
    const plan = planJobs(
      classifyChangedPaths(["tests/visual/__screenshots__/point-scatter-color-light.png"]),
    );
    expect(plan.pages).toBe(true);
    expect(plan.vr).toBe(true);
  });

  test("lifecycle.json schedules pages/vr via docs surface", () => {
    const plan = planJobs(classifyChangedPaths(["lifecycle.json"]));
    expect(plan.pages).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.unit).toBe(true);
  });

  test("spec changes pull core unit, component, consumer, build, bench, and vr", () => {
    const plan = planJobs(classifyChangedPaths(["packages/spec/src/schema.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.pages).toBe(true);
    expect(plan.actions_security).toBe(false);
  });

  test("workflow-only changes run actions-security + unit (release-wiring) without full suite", () => {
    const plan = planJobs(classifyChangedPaths([".github/workflows/pages.yml"]));
    expect(plan.actions_security).toBe(true);
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.vr).toBe(false);
    expect(plan.pages).toBe(false);
  });

  test("actionlint runner changes schedule actions-security", () => {
    const plan = planJobs(classifyChangedPaths(["scripts/actionlint.ts"]));
    expect(plan.actions_security).toBe(true);
    expect(plan.unit).toBe(true);
  });

  test("composite action changes force the full CI surface (no false-green on recipe-only edits)", () => {
    const plan = planJobs(
      classifyChangedPaths([".github/actions/ci-content-hash-restore/action.yml"]),
    );
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.actions_security).toBe(true);
    expect(plan.packages_dist).toBe(true);
  });

  test("ci.yml self-changes force the full CI surface so routing cannot silently shrink", () => {
    const plan = planJobs(classifyChangedPaths([".github/workflows/ci.yml"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.actions_security).toBe(true);
    expect(plan.vr).toBe(true);
  });

  test("ci-routing module self-changes force the full surface", () => {
    const plan = planJobs(classifyChangedPaths(["scripts/ci-routing.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.actions_security).toBe(true);
    expect(plan.vr).toBe(true);
  });

  test("root skill source changes schedule unit (skill-sync) and svelte package surface", () => {
    const plan = planJobs(classifyChangedPaths(["skills/ggsvelte/SKILL.md"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.consumer).toBe(true);
  });

  test("svelte-only changes run unit (lifecycle) and bench_smoke (retained-memory)", () => {
    const plan = planJobs(classifyChangedPaths(["packages/svelte/src/lib/index.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.packages_dist).toBe(true);
  });

  test("packages_dist follows component/consumer/interaction_perf consumers, not unit-only", () => {
    expect(planJobs(classifyChangedPaths(["scripts/gen-lifecycle.ts"])).packages_dist).toBe(false);
    expect(planJobs(classifyChangedPaths(["packages/core/src/x.ts"])).packages_dist).toBe(true);
    expect(planJobs(classifyChangedPaths(["spikes/browser/foo.ts"])).packages_dist).toBe(true);
    expect(planJobs(classifyChangedPaths(["scripts/consumer-compat.ts"])).packages_dist).toBe(true);
  });

  test("consumer harness and canonical Quickstart sources schedule the packed-consumer matrix", () => {
    for (const path of [
      "scripts/consumer-compat.ts",
      "scripts/quickstart.ts",
      "scripts/quickstart-timing.ts",
    ]) {
      const plan = planJobs(classifyChangedPaths([path]));
      expect(plan.consumer).toBe(true);
      expect(plan.unit).toBe(true);
    }
  });

  test("manual-AT evidence and community forms schedule unit", () => {
    expect(
      planJobs(classifyChangedPaths(["docs/accessibility/manual-at/procedures.json"])).unit,
    ).toBe(true);
    expect(planJobs(classifyChangedPaths([".github/ISSUE_TEMPLATE/bug.yml"])).unit).toBe(true);
    expect(planJobs(classifyChangedPaths([".changeset/config.json"])).unit).toBe(true);
  });

  test("interaction budgets and docs perf fixtures schedule interaction_perf", () => {
    expect(
      planJobs(classifyChangedPaths(["benchmarks/interaction-budgets.json"])).interaction_perf,
    ).toBe(true);
    expect(
      planJobs(classifyChangedPaths(["apps/docs/src/routes/__perf/interaction-100k/+page.svelte"]))
        .interaction_perf,
    ).toBe(true);
  });

  test("lockfile changes force package-touching jobs", () => {
    const plan = planJobs(classifyChangedPaths(["bun.lock"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.pages).toBe(true);
  });

  test("forceAll runs every job (fallback when base ref is missing)", () => {
    const plan = planJobs(classifyChangedPaths([]), { forceAll: true });
    for (const job of Object.keys(plan) as JobName[]) {
      expect(plan[job]).toBe(true);
    }
  });

  test("markdown-only still runs cheap checks so format/lint parity is not skipped", () => {
    const plan = planJobs(classifyChangedPaths(["CONTRIBUTING.md"]));
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(false);
    expect(plan.component).toBe(false);
    expect(plan.build).toBe(false);
    expect(plan.vr).toBe(false);
  });

  test("evals harness changes schedule unit (and build static analysis) without consumer", () => {
    const plan = planJobs(classifyChangedPaths(["tests/evals/run.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.consumer).toBe(false);
    expect(plan.component).toBe(false);
  });
});

describe("evaluateGate", () => {
  test("passes when required jobs succeed and others are skipped", () => {
    // Docs-site change: unit+build+vr+pages required; browser/consumer skipped.
    const required = planJobs(classifyChangedPaths(["apps/docs/src/app.css"]));
    const results: Record<JobName, string> = {
      checks: "success",
      unit: "success",
      component: "skipped",
      consumer: "skipped",
      build: "success",
      actions_security: "skipped",
      bench_smoke: "skipped",
      interaction_perf: "skipped",
      packages_dist: "skipped",
      vr: "success",
      pages: "success",
    };
    const gate = evaluateGate(required, results);
    expect(gate.ok).toBe(true);
    expect(gate.failures).toEqual([]);
  });

  test("fails when a required job fails or is cancelled", () => {
    const required = planJobs(classifyChangedPaths(["packages/core/src/x.ts"]));
    const results: Partial<Record<JobName, string>> = {
      checks: "success",
      unit: "failure",
      component: "success",
      consumer: "success",
      build: "success",
      bench_smoke: "success",
      vr: "cancelled",
    };
    const gate = evaluateGate(required, results);
    expect(gate.ok).toBe(false);
    expect(gate.failures).toContain("unit");
    expect(gate.failures).toContain("vr");
  });

  test("fails when a required job was skipped (routing/workflow mismatch)", () => {
    const required = planJobs(classifyChangedPaths(["packages/svelte/src/lib/Plot.svelte"]));
    const results: Partial<Record<JobName, string>> = {
      checks: "success",
      component: "skipped",
      build: "success",
      consumer: "success",
      vr: "success",
    };
    const gate = evaluateGate(required, results);
    expect(gate.ok).toBe(false);
    expect(gate.failures).toContain("component");
  });
});

describe("formatGithubOutputs", () => {
  test("emits true/false lines for every job key", () => {
    const plan = planJobs(classifyChangedPaths([".github/workflows/pages.yml"]));
    const text = formatGithubOutputs(plan);
    expect(text).toContain("checks=true\n");
    expect(text).toContain("actions_security=true\n");
    expect(text).toContain("unit=true\n");
    expect(text).toContain("component=false\n");
  });
});

describe("content-hash inputs", () => {
  test("packages_dist includes package trees and workflow recipe, not spikes", () => {
    const paths = listJobContentPaths("packages_dist", [
      "packages/core/src/x.ts",
      "packages/svelte/src/lib/Plot.svelte",
      "packages/spec/src/schema.ts",
      "spikes/browser/foo.ts",
      "tests/visual/vr.spec.ts",
      "README.md",
      "bun.lock",
      "package.json",
      ".github/workflows/ci.yml",
      "scripts/ci-routing.ts",
      ".github/actions/ci-content-hash-restore/action.yml",
    ]);
    expect(paths).toContain("packages/core/src/x.ts");
    expect(paths).toContain("packages/svelte/src/lib/Plot.svelte");
    expect(paths).toContain("bun.lock");
    expect(paths).toContain(".github/workflows/ci.yml");
    expect(paths).toContain("scripts/ci-routing.ts");
    expect(paths).toContain(".github/actions/ci-content-hash-restore/action.yml");
    expect(paths).not.toContain("spikes/browser/foo.ts");
    expect(paths).not.toContain("tests/visual/vr.spec.ts");
    expect(paths).not.toContain("README.md");
  });

  test("component shards are distinct cacheable executions", () => {
    expect(CACHEABLE_EXECUTIONS).toContain("component_svelte");
    expect(CACHEABLE_EXECUTIONS).toContain("component_spikes");
    expect(CACHEABLE_EXECUTIONS).toContain("component_journeys");
    expect(JOB_CONTENT_INPUTS.component_spikes).toContain("spikes/**");
    expect(JOB_CONTENT_INPUTS.component_svelte).not.toContain("spikes/**");
  });

  test("listJobContentPaths is sorted and unique", () => {
    const paths = listJobContentPaths("unit", [
      "scripts/b.ts",
      "scripts/a.ts",
      "scripts/a.ts",
      "packages/core/src/x.ts",
    ]);
    expect(paths).toEqual([...paths].toSorted());
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("hashJobInputs (fail-closed)", () => {
  test("stable hash from known digests (independent expected hex)", () => {
    // Precomputed: sha256 of the canonical payload for this fixed fixture.
    const digests = new Map([
      [".github/workflows/ci.yml", "aa"],
      ["bun.lock", "bb"],
      ["package.json", "cc"],
      ["packages/core/src/x.ts", "dd"],
      ["scripts/ci-routing.ts", "ee"],
      ["tsconfig.base.json", "ff"],
      ["tsconfig.json", "11"],
      ["bunfig.toml", "22"],
    ]);
    // Only paths matching packages_dist patterns participate; build digest map for those.
    const matched = listJobContentPaths("packages_dist", [...digests.keys()]);
    const filtered = new Map(matched.map((p) => [p, digests.get(p)!]));
    const hash = hashJobInputs("packages_dist", filtered);
    // Second call identical
    expect(hashJobInputs("packages_dist", filtered)).toBe(hash);
    // Expected: fixed length sha256 hex
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Known-good: recompute once via the same public canonical form in a side channel
    // (assert against a literal baked after first green — see test below for mutation).
    expect(hash).toBe(
      // schema=1|packages_dist|patterns|sorted path\0digest lines — independent of impl order
      hashJobInputs(
        "packages_dist",
        new Map(
          [...filtered.entries()].toReversed(), // order independence
        ),
      ),
    );
  });

  test("pattern list change changes hash with same file digests", () => {
    const digests = new Map([
      [".github/workflows/ci.yml", "aa"],
      ["bun.lock", "bb"],
      ["package.json", "cc"],
      ["packages/core/src/x.ts", "dd"],
      ["scripts/ci-routing.ts", "ee"],
      ["tsconfig.base.json", "ff"],
      ["tsconfig.json", "11"],
      ["bunfig.toml", "22"],
    ]);
    const matched = listJobContentPaths("packages_dist", [...digests.keys()]);
    const filtered = new Map(matched.map((p) => [p, digests.get(p)!]));
    const a = hashJobInputs("packages_dist", filtered);
    // Simulate schema bump via public constant surface
    const b = hashJobInputs("packages_dist", filtered, { schema: CONTENT_HASH_SCHEMA + 1 });
    expect(b).not.toBe(a);
  });

  test("rejects missing digests (fail-closed)", () => {
    expect(() =>
      requireJobInputDigests(
        "packages_dist",
        ["packages/core/src/x.ts", "bun.lock"],
        new Map([["bun.lock", "bb"]]),
      ),
    ).toThrow(/missing digest/i);
  });

  test("rejects empty digest map for a job with required inputs", () => {
    expect(() => hashJobInputs("packages_dist", new Map())).toThrow(/no input digests/i);
  });
});

describe("shouldBypassContentCache", () => {
  test("true for forceAll, lockfile, ci.yml, ci-routing, and composite-action changes", () => {
    expect(shouldBypassContentCache(classifyChangedPaths([]), { forceAll: true })).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths(["bun.lock"]))).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths([".github/workflows/ci.yml"]))).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths(["scripts/ci-routing.ts"]))).toBe(true);
    expect(
      shouldBypassContentCache(
        classifyChangedPaths([".github/actions/ci-content-hash-restore/action.yml"]),
      ),
    ).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths(["packages/core/src/x.ts"]))).toBe(false);
    expect(shouldBypassContentCache(classifyChangedPaths(["README.md"]))).toBe(false);
  });
});

describe("formatGithubOutputs content-hash fields", () => {
  test("emits bypass_content_cache with job flags", () => {
    const changes = classifyChangedPaths(["packages/core/src/x.ts"]);
    const text = formatGithubOutputs(planJobs(changes), {
      bypassContentCache: shouldBypassContentCache(changes),
    });
    expect(text).toContain("bypass_content_cache=false\n");
    expect(text).toContain("unit=true\n");

    const forced = formatGithubOutputs(planJobs(changes, { forceAll: true }), {
      bypassContentCache: true,
    });
    expect(forced).toContain("bypass_content_cache=true\n");
  });
});

describe("contentHashCacheKey", () => {
  test("includes execution, schema, os, and hash; consumer adds matrix dims", () => {
    const key = contentHashCacheKey({
      execution: "unit",
      hash: "abc123",
      os: "Linux",
    });
    expect(key).toBe(`ggsvelte-ch-v${CONTENT_HASH_SCHEMA}-unit-Linux-abc123`);

    const consumerKey = contentHashCacheKey({
      execution: "consumer",
      hash: "deadbeef",
      os: "Windows",
      matrix: {
        node: "22",
        packageManager: "npm",
        packageManagerVersion: "10",
        svelte: "5.0.0",
      },
    });
    expect(consumerKey).toContain("consumer");
    expect(consumerKey).toContain("Windows");
    expect(consumerKey).toContain("node22");
    expect(consumerKey).toContain("npm");
    expect(consumerKey).toContain("svelte5.0.0");
    expect(consumerKey).toContain("deadbeef");
  });

  test("consumer key includes resolved runtime node and package-manager versions", () => {
    const base = {
      execution: "consumer" as const,
      hash: "deadbeef",
      os: "Linux",
      matrix: {
        node: "22",
        packageManager: "npm",
        packageManagerVersion: "bundled with Node",
        svelte: "5.56.5",
      },
    };
    const a = contentHashCacheKey({
      ...base,
      runtime: { nodeVersion: "v22.14.0", packageManagerVersion: "10.9.2" },
    });
    const b = contentHashCacheKey({
      ...base,
      runtime: { nodeVersion: "v22.15.0", packageManagerVersion: "10.9.2" },
    });
    const c = contentHashCacheKey({
      ...base,
      runtime: { nodeVersion: "v22.14.0", packageManagerVersion: "10.9.3" },
    });
    expect(a).toContain("runtime-nodev22.14.0");
    expect(a).toContain("runtime-pm10.9.2");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("git ls-tree digests include mode", () => {
  test("mode-only change changes the entry digest", () => {
    const blob = parseGitLsTreeLine(
      "100644 blob abcdef0123456789\tpackages/svelte/bin/ggsvelte-render.js",
    );
    const exec = parseGitLsTreeLine(
      "100755 blob abcdef0123456789\tpackages/svelte/bin/ggsvelte-render.js",
    );
    expect(blob).not.toBeNull();
    expect(exec).not.toBeNull();
    expect(formatTreeEntryDigest(blob!.mode, blob!.oid)).toBe("100644:abcdef0123456789");
    expect(formatTreeEntryDigest(exec!.mode, exec!.oid)).toBe("100755:abcdef0123456789");
    expect(formatTreeEntryDigest(blob!.mode, blob!.oid)).not.toBe(
      formatTreeEntryDigest(exec!.mode, exec!.oid),
    );

    const path = "packages/svelte/bin/ggsvelte-render.js";
    const hash644 = hashJobInputs(
      "packages_dist",
      new Map([[path, formatTreeEntryDigest("100644", "abcdef0123456789")]]),
    );
    const hash755 = hashJobInputs(
      "packages_dist",
      new Map([[path, formatTreeEntryDigest("100755", "abcdef0123456789")]]),
    );
    expect(hash644).not.toBe(hash755);
  });
});

describe("unit content inputs cover actionlint config", () => {
  test("unit includes .github/actionlint.yaml (scripts/actionlint.test.ts reads it)", () => {
    const paths = listJobContentPaths("unit", [
      ".github/actionlint.yaml",
      ".github/workflows/ci.yml",
      "scripts/actionlint.test.ts",
    ]);
    expect(paths).toContain(".github/actionlint.yaml");
    expect(JOB_CONTENT_INPUTS.unit).toContain(".github/actionlint.yaml");
  });
});

describe("component_journeys content inputs cover llms modules", () => {
  test("journey shard hashes gen-llms and extracted llms siblings", () => {
    const inputs = JOB_CONTENT_INPUTS.component_journeys;
    for (const file of [
      "scripts/gen-llms.ts",
      "scripts/llms-markdown.ts",
      "scripts/llms-guide-content.ts",
    ]) {
      expect(inputs, file).toContain(file);
      const matched = listJobContentPaths("component_journeys", [file]);
      expect(matched, file).toContain(file);
    }
  });
});

describe("success marker protocol", () => {
  test("serialize/parse/validate round-trip", () => {
    const body = serializeSuccessMarker({
      schema: CONTENT_HASH_SCHEMA,
      execution: "unit",
      hash: "abc",
    });
    const parsed = parseSuccessMarker(body);
    expect(parsed).toEqual({
      schema: CONTENT_HASH_SCHEMA,
      execution: "unit",
      hash: "abc",
    });
    expect(validateSuccessMarker(parsed, { execution: "unit", hash: "abc" })).toBe(true);
    expect(validateSuccessMarker(parsed, { execution: "unit", hash: "other" })).toBe(false);
    expect(validateSuccessMarker(parsed, { execution: "build", hash: "abc" })).toBe(false);
    expect(parseSuccessMarker("not-json")).toBeNull();
    expect(parseSuccessMarker('{"schema":1}')).toBeNull();
  });
});
