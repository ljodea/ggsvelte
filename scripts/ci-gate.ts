/**
 * CI gate evaluator CLI — used by the ci-gate job after path routing.
 * Reads required flags + job results from the environment (see ci-job-ci-gate).
 */
import { evaluateGate, type JobName, type JobPlan, type JobResult } from "./ci-routing.ts";

const env = process.env;

if (env.DETECT_RESULT !== "success") {
  console.error("::error::detect-changes failed — cannot trust routing");
  process.exit(1);
}

const req = (k: string) => env[k] === "true";
const required: JobPlan = {
  checks: req("CHECKS_REQ"),
  unit: req("UNIT_REQ"),
  component: req("COMPONENT_REQ"),
  consumer: req("CONSUMER_REQ"),
  build: req("BUILD_REQ"),
  svelte_check: req("SVELTE_CHECK_REQ"),
  docs_site: req("DOCS_SITE_REQ"),
  actions_security: req("ACTIONS_REQ"),
  bench_smoke: req("BENCH_REQ"),
  interaction_perf: false,
  packages_dist: req("PACKAGES_DIST_REQ"),
  vr: false,
  pages: false,
  docs_journeys: req("DOCS_JOURNEYS_REQ"),
};

const shard = (k: string): JobResult => (env[k] as JobResult) || "skipped";
// Issue #243: package browser surface is svelte+spikes only.
// Journeys are gated separately via docs_journeys.
const componentShards = [shard("COMPONENT_SVELTE_RES"), shard("COMPONENT_SPIKES_RES")];
let componentResult: JobResult = "skipped";
if (componentShards.every((r) => r === "skipped")) componentResult = "skipped";
else if (componentShards.every((r) => r === "success")) componentResult = "success";
else if (componentShards.some((r) => r === "failure" || r === "cancelled"))
  componentResult = "failure";
else componentResult = "unknown";

const results: Partial<Record<JobName, JobResult>> = {
  checks: env.CHECKS_RES as JobResult,
  unit: env.UNIT_RES as JobResult,
  component: componentResult,
  consumer: env.CONSUMER_RES as JobResult,
  build: env.BUILD_RES as JobResult,
  svelte_check: env.SVELTE_CHECK_RES as JobResult,
  docs_site: env.DOCS_SITE_RES as JobResult,
  actions_security: env.ACTIONS_RES as JobResult,
  bench_smoke: env.BENCH_RES as JobResult,
  packages_dist: env.PACKAGES_DIST_RES as JobResult,
  docs_journeys: shard("DOCS_JOURNEYS_RES"),
};

const gate = evaluateGate(required, results);
const failures = [...gate.failures];
if (env.EVENT_NAME === "pull_request") {
  const guard = env.VR_GUARD_RES;
  if (guard !== "success" && guard !== "skipped") {
    failures.push(`vr-baseline-guard:${guard}`);
  }
  if (guard === "skipped") {
    failures.push("vr-baseline-guard:skipped");
  }
}
if (failures.length > 0) {
  console.error("ci-gate failed:", failures.join(", "));
  process.exit(1);
}
console.log("ci-gate ok");
