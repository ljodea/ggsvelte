/**
 * ci-gate job driver (extracted from .github/workflows/ci.yml's `ci-gate`
 * job, "evaluate required jobs" step). The step's leading bash guard
 * (`DETECT_RESULT != success` → `::error::detect-changes failed — cannot
 * trust routing` + exit 1) stays in the workflow YAML unchanged; by the time
 * this driver runs, detect-changes is known to have succeeded.
 *
 * `component` is not read from `needs.<job>.result` directly — it is rolled
 * up from the two component shards (component-svelte, component-spikes;
 * issue #243) so a single required flag covers both.
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
 * Roll up the two component test shards into one `JobResult`. Both skipped
 * → skipped; both success → success; either failure/cancelled → failure;
 * anything else (e.g. one success one skipped, or an unrecognized string) →
 * unknown.
 */
export function aggregateComponentShards(
  svelteResult: string | undefined,
  spikesResult: string | undefined,
): JobResult {
  const shards = [normalizeJobResult(svelteResult), normalizeJobResult(spikesResult)];
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
  componentSvelteResult: string | undefined;
  componentSpikesResult: string | undefined;
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
    component: aggregateComponentShards(input.componentSvelteResult, input.componentSpikesResult),
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
