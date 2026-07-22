/**
 * ci-gate job driver (extracted from .github/workflows/ci.yml's `ci-gate`
 * job, "evaluate required jobs" step). The step's leading bash guard
 * (`DETECT_RESULT != success` → `::error::detect-changes failed — cannot
 * trust routing` + exit 1) stays in the workflow YAML unchanged; by the time
 * this driver runs, detect-changes is known to have succeeded.
 *
 * `component` is not read from `needs.<job>.result` directly — it is rolled
 * up from the component test shards (component-svelte, component-svelte-fx,
 * component-spikes; issues #243, #575) so a single required flag covers all
 * of them. The shard list is an array (not fixed-arity params) because it
 * has already grown once and the aggregation rule is shard-count-agnostic.
 */
import {
  evaluateGate,
  normalizeJobResult,
  type GateEvaluation,
  type JobName,
  type JobPlan,
  type JobResult,
} from "./routing";

/**
 * Roll up the component test shards into one `JobResult`. All skipped →
 * skipped; all success → success; any failure/cancelled → failure; anything
 * else (e.g. one success one skipped, or an unrecognized string) → unknown.
 */
export function aggregateComponentShards(shardResults: readonly (string | undefined)[]): JobResult {
  const shards = shardResults.map((r) => normalizeJobResult(r));
  if (shards.every((r) => r === "skipped")) return "skipped";
  if (shards.every((r) => r === "success")) return "success";
  if (shards.some((r) => r === "failure" || r === "cancelled")) return "failure";
  return "unknown";
}

export type CiGateInput = {
  eventName: string;
  required: JobPlan;
  /** Raw `needs.<job>.result` strings, one per non-component required job. */
  results: Partial<Record<JobName, string | undefined>>;
  componentShardResults: readonly (string | undefined)[];
  /**
   * Raw `needs.vr-baseline-guard.result` — intentionally NOT normalized.
   * The PR-only rule below observes the literal value (including an
   * `undefined`/`""` env var) rather than treating it as "skipped".
   */
  vrBaselineGuardResult: string | undefined;
};

/**
 * Evaluate the required-jobs gate: `evaluateGate` over every routed job
 * (with `component` replaced by the shard rollup) plus a PR-only rule that
 * vr-baseline-guard must be `success` — it always schedules on
 * `pull_request`, so any other result (including `skipped`) is a failure.
 */
export function evaluateCiGate(input: CiGateInput): GateEvaluation {
  const results: Partial<Record<JobName, string | undefined>> = {
    ...input.results,
    component: aggregateComponentShards(input.componentShardResults),
  };

  const gate = evaluateGate(input.required, results);
  const failures = [...gate.failures];

  if (input.eventName === "pull_request") {
    const guard = input.vrBaselineGuardResult;
    if (guard !== "success" && guard !== "skipped") {
      failures.push(`vr-baseline-guard:${guard}`);
    }
    if (guard === "skipped") {
      failures.push("vr-baseline-guard:skipped");
    }
  }

  return { ok: failures.length === 0, failures };
}
