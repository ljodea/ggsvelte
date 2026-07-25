/**
 * Wiring contract for the vr-gate required check (#742). The evaluator's own
 * rules live in scripts/ci-routing/vr-gate.test.ts; this file asserts that
 * vr-compare.yml actually hands it the right inputs and that the job cannot
 * be silently routed out of existence.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(join(import.meta.dir, "../.github/workflows/vr-compare.yml"), "utf8");

/** The `vr-gate:` job block, up to the next top-level job key. */
function vrGateJob(): string {
  const start = workflow.indexOf("\n  vr-gate:");
  expect(start, "vr-compare.yml declares a vr-gate job").toBeGreaterThan(-1);
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][\w-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe("vr-gate wiring", () => {
  test("runs on every pull request, whatever routing decided", () => {
    const job = vrGateJob();
    // `always()` is what makes the gate report even when compare failed or was
    // skipped — without it the required context would simply never appear and
    // the PR would sit unmergeable.
    expect(job).toContain("if: always() && github.event_name == 'pull_request'");
  });

  test("depends on both jobs whose results it judges", () => {
    const job = vrGateJob();
    expect(job).toContain("needs: [detect-changes, compare]");
  });

  test("delegates the verdict to the tested evaluator, not to YAML expressions", () => {
    const job = vrGateJob();
    expect(job).toContain("bun scripts/ci-routing.ts vr-gate");
    for (const variable of ["DETECT_RESULT", "VR_ROUTED", "COMPARE_RESULT"]) {
      expect(job, variable).toContain(`${variable}:`);
    }
  });

  test("its check name is stable — the ruleset pins this exact string", () => {
    // Renaming this breaks the required-status-check context on the "Protect
    // main" ruleset, which fails open (the check never reports). Treat the
    // name as an external contract.
    expect(vrGateJob()).toContain("name: vr-gate (required pixel aggregator)");
  });
});
