import { describe, expect, test } from "bun:test";

import { evaluateVrGate } from "./vr-gate";

describe("evaluateVrGate", () => {
  test("routing skipped the pixel job — nothing to compare, gate passes", () => {
    const verdict = evaluateVrGate({
      detectChangesResult: "success",
      vrRouted: false,
      compareResult: "skipped",
    });
    expect(verdict.ok).toBe(true);
  });

  test("pixel compare failed — the exact case #732 merged through", () => {
    const verdict = evaluateVrGate({
      detectChangesResult: "success",
      vrRouted: true,
      compareResult: "failure",
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("failure");
  });

  test("routed but the pixel job never reported — fail closed, never assume green", () => {
    for (const compareResult of ["skipped", "cancelled", undefined, ""]) {
      const verdict = evaluateVrGate({
        detectChangesResult: "success",
        vrRouted: true,
        compareResult,
      });
      expect(verdict.ok, `compare=${String(compareResult)}`).toBe(false);
    }
  });

  test("routing itself failed — its vr flag cannot be trusted either way", () => {
    const verdict = evaluateVrGate({
      detectChangesResult: "failure",
      vrRouted: false,
      compareResult: "skipped",
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("detect-changes");
  });

  test("routed and the pixel compare passed — the only way a rendering change lands", () => {
    const verdict = evaluateVrGate({
      detectChangesResult: "success",
      vrRouted: true,
      compareResult: "success",
    });
    expect(verdict.ok).toBe(true);
  });
});
