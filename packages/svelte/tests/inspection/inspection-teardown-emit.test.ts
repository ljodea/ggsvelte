/**
 * Pure unit tests for inspection/teardown.ts decision tables:
 * resolveInspectionEmitAction.
 */
import { describe, expect, it } from "vitest";

import { resolveInspectionEmitAction } from "../../src/lib/inspection/teardown.js";
describe("resolveInspectionEmitAction", () => {
  it("on change with undefined semanticFingerprint emits without updating last", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: undefined,
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: null });
  });

  it("on clear builds clear:source fingerprint (ignores semanticFingerprint)", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "clear",
        source: "keyboard",
        semanticFingerprint: "sem:ignored",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: "clear:keyboard" });
  });

  it("skips when resolved fingerprint equals last, including empty string", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: "",
        lastFingerprint: "",
      }),
    ).toEqual({ type: "skip" });
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: "sem:a",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "skip" });
    expect(
      resolveInspectionEmitAction({
        phase: "clear",
        source: "touch",
        semanticFingerprint: undefined,
        lastFingerprint: "clear:touch",
      }),
    ).toEqual({ type: "skip" });
  });

  it("emits and updates when change fingerprint differs from last", () => {
    expect(
      resolveInspectionEmitAction({
        phase: "change",
        source: "pointer",
        semanticFingerprint: "sem:b",
        lastFingerprint: "sem:a",
      }),
    ).toEqual({ type: "emit", updateFingerprint: "sem:b" });
  });

  it("characterizes a stateful sequence including clear tokens", () => {
    let last = "";
    const step = (
      phase: "clear" | "change",
      source: "pointer" | "keyboard" | "touch" | "programmatic",
      semanticFingerprint?: string,
    ) => {
      const action = resolveInspectionEmitAction({
        phase,
        source,
        semanticFingerprint,
        lastFingerprint: last,
      });
      if (action.type === "emit" && action.updateFingerprint !== null)
        last = action.updateFingerprint;
      return action;
    };

    // change with omitted semantic never mutates last
    expect(step("change", "pointer")).toEqual({ type: "emit", updateFingerprint: null });
    expect(last).toBe("");

    // empty semantic collides with initial last → skip
    expect(step("change", "pointer", "")).toEqual({ type: "skip" });
    expect(last).toBe("");

    // first real fingerprint updates
    expect(step("change", "pointer", "sem:1")).toEqual({
      type: "emit",
      updateFingerprint: "sem:1",
    });
    expect(last).toBe("sem:1");

    // equal suppresses
    expect(step("change", "pointer", "sem:1")).toEqual({ type: "skip" });
    expect(last).toBe("sem:1");

    // clear after semantic → emit clear:source and update
    expect(step("clear", "keyboard")).toEqual({
      type: "emit",
      updateFingerprint: "clear:keyboard",
    });
    expect(last).toBe("clear:keyboard");

    // same clear token suppresses
    expect(step("clear", "keyboard")).toEqual({ type: "skip" });
    expect(last).toBe("clear:keyboard");
  });
});
