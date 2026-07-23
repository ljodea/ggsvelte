/**
 * Characterization tests for the ci-gate job driver, extracted verbatim from
 * the `bun -e '...'` heredoc formerly inlined in .github/workflows/ci.yml's
 * `ci-gate` job (issue: astral-maintain ci.yml pass). The workflow's bash
 * guard (`DETECT_RESULT != success` → `::error::...` + exit 1) stays in the
 * YAML unchanged — these tests cover only what ran inside the heredoc.
 */
import { describe, expect, test } from "bun:test";

import { aggregateComponentShards, evaluateCiGate, type CiGateInput } from "./ci-gate";
import type { JobPlan } from "./routing";

const ALL_UNREQUIRED: JobPlan = {
  checks: false,
  unit: false,
  component: false,
  consumer: false,
  build: false,
  svelte_check: false,
  docs_site: false,
  actions_security: false,
  bench_smoke: false,
  interaction_perf: false,
  packages_dist: false,
  vr: false,
  pages: false,
  docs_journeys: false,
};

function baseInput(over: Partial<CiGateInput> = {}): CiGateInput {
  return {
    eventName: "pull_request",
    required: ALL_UNREQUIRED,
    results: {},
    componentShardResults: [],
    vrBaselineGuardResult: "success",
    ...over,
  };
}

describe("aggregateComponentShards", () => {
  test("all skipped → skipped (missing env var, empty string, or explicit 'skipped')", () => {
    expect(aggregateComponentShards(["skipped", "skipped"])).toBe("skipped");
    expect(aggregateComponentShards(["", ""])).toBe("skipped");
    expect(aggregateComponentShards(["skipped", "skipped", "skipped"])).toBe("skipped");
  });

  test("all success → success", () => {
    expect(aggregateComponentShards(["success", "success"])).toBe("success");
    expect(aggregateComponentShards(["success", "success", "success"])).toBe("success");
  });

  test("one success, one skipped → unknown (not success, not all-skipped)", () => {
    expect(aggregateComponentShards(["success", "skipped"])).toBe("unknown");
  });

  test("any failure or cancelled present → failure", () => {
    expect(aggregateComponentShards(["failure", "success"])).toBe("failure");
    expect(aggregateComponentShards(["success", "cancelled"])).toBe("failure");
    expect(aggregateComponentShards(["failure", "cancelled"])).toBe("failure");
    expect(aggregateComponentShards(["failure", "skipped"])).toBe("failure");
    expect(aggregateComponentShards(["success", "success", "failure"])).toBe("failure");
  });

  test("unrecognized shard string → unknown", () => {
    expect(aggregateComponentShards(["bogus", "success"])).toBe("unknown");
  });

  test("three-shard reality (component-svelte, component-svelte-fx, component-spikes): one skip among two successes → unknown, not success", () => {
    expect(aggregateComponentShards(["success", "success", "skipped"])).toBe("unknown");
  });
});

describe("evaluateCiGate", () => {
  test("nothing required, all inputs empty → ok", () => {
    const gate = evaluateCiGate(baseInput());
    expect(gate).toEqual({ ok: true, failures: [] });
  });

  test("required job missing (skipped) → listed as failure", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, unit: true },
        results: {},
      }),
    );
    expect(gate.ok).toBe(false);
    expect(gate.failures).toEqual(["unit"]);
  });

  test("required job succeeded → not listed", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, unit: true },
        results: { unit: "success" },
      }),
    );
    expect(gate).toEqual({ ok: true, failures: [] });
  });

  test("required job failed/cancelled → listed", () => {
    expect(
      evaluateCiGate(
        baseInput({
          required: { ...ALL_UNREQUIRED, build: true },
          results: { build: "failure" },
        }),
      ).failures,
    ).toEqual(["build"]);
    expect(
      evaluateCiGate(
        baseInput({
          required: { ...ALL_UNREQUIRED, build: true },
          results: { build: "cancelled" },
        }),
      ).failures,
    ).toEqual(["build"]);
  });

  test("not-required job's failure is ignored", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: ALL_UNREQUIRED,
        results: { build: "failure" },
      }),
    );
    expect(gate).toEqual({ ok: true, failures: [] });
  });

  test("component result is derived from the shard inputs, not results.component", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, component: true },
        results: { component: "success" }, // must be ignored — shards win
        componentShardResults: ["failure", "success"],
      }),
    );
    expect(gate.failures).toEqual(["component"]);
  });

  test("component required + all shards success (svelte, svelte-fx, spikes) → not listed", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, component: true },
        componentShardResults: ["success", "success", "success"],
      }),
    );
    expect(gate).toEqual({ ok: true, failures: [] });
  });

  test("component required + one of three shards fails → listed", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, component: true },
        componentShardResults: ["success", "failure", "success"],
      }),
    );
    expect(gate.failures).toEqual(["component"]);
  });

  test("docs_journeys is independent of component shards", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, docs_journeys: true },
        results: { docs_journeys: "success" },
        componentShardResults: ["failure", "failure", "failure"],
      }),
    );
    expect(gate).toEqual({ ok: true, failures: [] });
  });

  test("docs_journeys missing result → normalized to skipped → listed", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, docs_journeys: true },
        results: {},
      }),
    );
    expect(gate.failures).toEqual(["docs_journeys"]);
  });

  test("multiple required-job failures are all listed, in JOB_NAMES order", () => {
    const gate = evaluateCiGate(
      baseInput({
        required: { ...ALL_UNREQUIRED, unit: true, build: true, docs_site: true },
        results: { unit: "failure", build: "success", docs_site: "cancelled" },
      }),
    );
    expect(gate.failures).toEqual(["unit", "docs_site"]);
  });

  describe("vr-baseline-guard PR-only rule", () => {
    test("non-pull_request event never checks the guard, even when missing/failed", () => {
      const gate = evaluateCiGate(
        baseInput({ eventName: "push", vrBaselineGuardResult: undefined }),
      );
      expect(gate).toEqual({ ok: true, failures: [] });

      const gate2 = evaluateCiGate(
        baseInput({ eventName: "push", vrBaselineGuardResult: "failure" }),
      );
      expect(gate2).toEqual({ ok: true, failures: [] });
    });

    test("pull_request + guard success → no failure entry", () => {
      const gate = evaluateCiGate(
        baseInput({ eventName: "pull_request", vrBaselineGuardResult: "success" }),
      );
      expect(gate).toEqual({ ok: true, failures: [] });
    });

    test("pull_request + guard skipped → exactly one vr-baseline-guard:skipped entry", () => {
      const gate = evaluateCiGate(
        baseInput({ eventName: "pull_request", vrBaselineGuardResult: "skipped" }),
      );
      expect(gate.failures).toEqual(["vr-baseline-guard:skipped"]);
    });

    test("pull_request + guard failure/cancelled/unknown → single vr-baseline-guard:<result> entry", () => {
      expect(evaluateCiGate(baseInput({ vrBaselineGuardResult: "failure" })).failures).toEqual([
        "vr-baseline-guard:failure",
      ]);
      expect(evaluateCiGate(baseInput({ vrBaselineGuardResult: "cancelled" })).failures).toEqual([
        "vr-baseline-guard:cancelled",
      ]);
      expect(evaluateCiGate(baseInput({ vrBaselineGuardResult: "bogus" })).failures).toEqual([
        "vr-baseline-guard:bogus",
      ]);
    });

    test("pull_request + guard undefined → vr-baseline-guard:undefined (raw, not normalized)", () => {
      const gate = evaluateCiGate(baseInput({ vrBaselineGuardResult: undefined }));
      expect(gate.failures).toEqual(["vr-baseline-guard:undefined"]);
    });

    test("pull_request + guard empty string → vr-baseline-guard: (raw, not normalized to skipped)", () => {
      const gate = evaluateCiGate(baseInput({ vrBaselineGuardResult: "" }));
      expect(gate.failures).toEqual(["vr-baseline-guard:"]);
    });

    test("guard failure appended after required-job failures", () => {
      const gate = evaluateCiGate(
        baseInput({
          required: { ...ALL_UNREQUIRED, unit: true },
          results: { unit: "failure" },
          vrBaselineGuardResult: "cancelled",
        }),
      );
      expect(gate.failures).toEqual(["unit", "vr-baseline-guard:cancelled"]);
    });
  });
});
