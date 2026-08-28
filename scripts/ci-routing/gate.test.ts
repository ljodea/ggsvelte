import { describe, expect, test } from "bun:test";

import {
  classifyChangedPaths,
  evaluateGate,
  formatGithubOutputs,
  planJobs,
  shouldBypassContentCache,
  type JobName,
} from "../ci-routing";

describe("evaluateGate", () => {
  test("passes when required jobs succeed and others are skipped", () => {
    // Docs-render change: unit+build+vr+pages+docs_journeys+packages_dist required.
    const required = planJobs(classifyChangedPaths(["apps/docs/src/app.css"]));
    expect(required.packages_dist).toBe(true);
    expect(required.docs_journeys).toBe(true);
    const results: Record<JobName, string> = {
      checks: "success",
      unit: "success",
      component: "skipped",
      consumer: "skipped",
      build: "success",
      svelte_check: "success",
      docs_site: "success",
      actions_security: "skipped",
      bench_smoke: "skipped",
      interaction_perf: "skipped",
      packages_dist: "success",
      vr: "success",
      pages: "success",
      docs_journeys: "success",
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
    const plan = planJobs(classifyChangedPaths([".github/workflows/cloudflare-pages.yml"]));
    const text = formatGithubOutputs(plan);
    expect(text).toContain("checks=true\n");
    expect(text).toContain("actions_security=true\n");
    expect(text).toContain("unit=true\n");
    expect(text).toContain("component=false\n");
  });

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
