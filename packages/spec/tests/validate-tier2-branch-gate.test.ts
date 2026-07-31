/**
 * Tier-2 eligibility gate: skip interpreted per-layer Value.Check when the
 * compiled plot check already proved branches (valid path), and reuse the
 * shape walk's per-layer Errors result when it did not (invalid path).
 * Production: validate.ts + validate-schema-shape.ts. Issue #1279.
 */
import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { Value } from "typebox/value";

import { validate } from "../src/validate.ts";

describe("tier 2 — layer branch gate (#1279)", () => {
  const spies: Array<{ mockRestore: () => void }> = [];
  afterEach(() => {
    while (spies.length > 0) spies.pop()!.mockRestore();
  });

  it("does not call interpreted Value.Check on a schema-valid tier-2 path", () => {
    const checkSpy = spyOn(Value, "Check");
    spies.push(checkSpy);

    const values = Array.from({ length: 200 }, (_, i) => ({ x: i, y: i % 10 }));
    const result = validate(
      {
        data: { values },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [
          { geom: "point" },
          { geom: "line" },
          { geom: "point", data: { values: values.slice(0, 50) } },
        ],
      },
      {},
    );

    expect(result.ok).toBe(true);
    // Compiled PLOT_SPEC_VALIDATOR.Check already proved every layer branch.
    // The tier-2 gate must not re-walk layers with the interpreted checker.
    expect(checkSpy).toHaveBeenCalledTimes(0);
  });

  it("still runs structural checks on branch-ok layers when the plot is schema-invalid", () => {
    // Layer 0: known geom, branch-valid, missing y → tier-2 structural error.
    // Layer 1: known geom, branch-invalid (bad stat) → shape error only; no
    // structural missing-channel for that layer (gate skips dirty branches).
    const result = validate(
      {
        layers: [
          { geom: "point", aes: { x: { field: "x" } } },
          { geom: "point", stat: "not-a-stat", aes: { x: { field: "x" }, y: { field: "y" } } },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const structural = result.errors.filter((e) => e.code === "missing-required-channel");
    expect(structural.map((e) => e.path)).toEqual(["/layers/0/aes/y"]);
    // Shape still reported the invalid branch on layer 1.
    expect(result.errors.some((e) => e.path.startsWith("/layers/1"))).toBe(true);
  });

  it("validates a multi-thousand-row layer-local dataset under tier-2 without the old Check walk", () => {
    // Characterization of the #1279 win: before the gate skip, interpreted
    // Value.Check re-walked every inline row per layer (tens of seconds at
    // 20k). After, compiled plot Check + structural rules stay interactive.
    const n = 5_000;
    const values = Array.from({ length: n }, (_, i) => ({ x: i, y: i % 100 }));
    const startedAt = performance.now();
    const result = validate(
      {
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" } },
            data: { values },
          },
        ],
      },
      {},
    );
    const elapsed = performance.now() - startedAt;
    expect(result.ok).toBe(true);
    // Loose ceiling: the old path was ~seconds per thousand rows; the new path
    // must stay well under interactive budgets on CI hardware.
    expect(elapsed).toBeLessThan(2_000);
  });
});
