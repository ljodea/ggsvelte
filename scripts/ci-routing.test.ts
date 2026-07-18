import { describe, expect, test } from "bun:test";

import {
  classifyChangedPaths,
  evaluateGate,
  formatGithubOutputs,
  matchPathPattern,
  parseNameStatusList,
  planJobs,
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
    const plan = planJobs(classifyChangedPaths(["scripts/gen-llms.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.pages).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.component).toBe(false);
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
  });

  test("consumer harness scripts schedule the packed-consumer matrix", () => {
    const plan = planJobs(classifyChangedPaths(["scripts/consumer-compat.ts"]));
    expect(plan.consumer).toBe(true);
    expect(plan.unit).toBe(true);
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
