/**
 * CI path routing — shared type vocabulary for lanes and job plans.
 * Pure types; pattern tables live in patterns.ts, planning in plan.ts.
 */

export type ChangeLane =
  | "spec"
  | "core"
  | "svelte"
  | "cli"
  | "docs"
  | "docs_render"
  | "examples"
  | "benchmarks"
  | "scripts"
  | "workers"
  | "evals"
  | "workflows"
  | "ci_workflow"
  | "ci_routing"
  | "ci_actions"
  | "visual"
  | "spikes"
  | "lockfile"
  | "markdown"
  | "performance"
  | "consumer_tools";

export type ChangeFlags = Record<ChangeLane, boolean>;

export type JobName =
  | "checks"
  | "unit"
  | "component"
  | "consumer"
  | "build"
  | "svelte_check"
  | "docs_site"
  | "actions_security"
  | "bench_smoke"
  | "interaction_perf"
  | "packages_dist"
  | "vr"
  | "pages"
  | "docs_journeys";

export type JobPlan = Record<JobName, boolean>;

export type JobResult = "success" | "failure" | "cancelled" | "skipped" | "unknown";
