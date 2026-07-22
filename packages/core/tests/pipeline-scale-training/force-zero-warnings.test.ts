/**
 * maybeForceZeroForBars / pushContinuousTrainingWarnings.
 */
import { describe, expect, it } from "bun:test";

describe("maybeForceZeroForBars / pushContinuousTrainingWarnings", () => {
  it("forces zero only for bar measures without an explicit domain", async () => {
    const { maybeForceZeroForBars } =
      await import("../../src/pipeline/scale-axis-train-continuous-zero.ts");
    const advisories: { code: string; path: string; chosen: string; howToOverride: string }[] = [];
    const inputs = {
      columns: [] as const,
      numeric: [new Float64Array([1, 2])],
      anyDiscrete: false,
      allTemporal: false,
      barMeasure: true,
      evidence: "test",
    };
    const forced = maybeForceZeroForBars("y", inputs, undefined, "linear", advisories);
    expect(forced).toBe(true);
    expect(advisories.map((a) => a.code)).toContain("zero-forced");
    expect(maybeForceZeroForBars("y", inputs, { domain: [0, 10] }, "linear", [])).toBeUndefined();
    // log10 has no semantic-zero image, so zero is never forced for it.
    expect(
      maybeForceZeroForBars("y", inputs, { type: "linear", transform: "log10" }, "linear", []),
    ).toBeUndefined();
  });

  it("emits the empty-domain warning (transform-domain drops are counted pre-stat)", async () => {
    const { pushContinuousTrainingWarnings } =
      await import("../../src/pipeline/scale-axis-train-continuous-warn.ts");
    const warnings: { code: string; message: string }[] = [];
    pushContinuousTrainingWarnings("x", "linear", { empty: true, nonPositive: 2 }, warnings);
    expect(warnings.map((w) => w.code)).toEqual(["empty-domain"]);
  });
});
