/**
 * lintSpec options.limits and validate({ lint: true }) wiring.
 * Per-rule characterization + catalog coverage: lint-rules.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { lintSpec } from "../src/lint.ts";
import { DEFAULT_VALIDATE_LIMITS } from "../src/validate-data.ts";
import { validate } from "../src/validate.ts";

const codesOf = (advisories: ReturnType<typeof lintSpec>) => advisories.map((a) => a.code);

describe("lintSpec options.limits", () => {
  /** Line-over-nominal-x fixture with `rows` nominal categories cycling a/b/c. */
  const nominalLineSpec = (rows: number) => {
    const cats = ["a", "b", "c"] as const;
    return {
      data: {
        columns: {
          x: Array.from({ length: rows }, (_, i) => cats[i % 3]!),
          y: Array.from({ length: rows }, (_, i) => i),
        },
      },
      aes: { x: { field: "x" }, y: { field: "y" } },
      layers: [{ geom: "line" }],
    };
  };

  it("raises maxRows so data above the default still yields data-backed advisories", () => {
    // Default maxRows is 100_000; one past that is skipped under defaults.
    const rows = DEFAULT_VALIDATE_LIMITS.maxRows + 1;
    const spec = nominalLineSpec(rows);

    expect(codesOf(lintSpec(spec))).not.toContain("line-over-nominal-x");

    const raised = lintSpec(spec, { limits: { maxRows: rows } });
    expect(codesOf(raised)).toContain("line-over-nominal-x");
  });

  it("lowers maxRows so over-limit inline data skips data-backed rules", () => {
    const spec = nominalLineSpec(15);

    // Under defaults (100k), the advisory fires.
    expect(codesOf(lintSpec(spec))).toContain("line-over-nominal-x");

    // Lowered limit: evidence is null, lint skips (never fabricates a complaint).
    expect(lintSpec(spec, { limits: { maxRows: 10 } })).toEqual([]);
  });

  it("lowers maxBytes so oversized inline data skips data-backed rules", () => {
    // Wide strings so a tiny maxBytes trips while row count stays small.
    const big = "x".repeat(200);
    const spec = {
      data: {
        columns: {
          x: [big, big, big],
          y: [1, 2, 3],
        },
      },
      aes: { x: { field: "x" }, y: { field: "y" } },
      layers: [{ geom: "line" }],
    };

    expect(codesOf(lintSpec(spec))).toContain("line-over-nominal-x");
    expect(lintSpec(spec, { limits: { maxBytes: 50 } })).toEqual([]);
  });
});

describe("validate({ lint: true }) wiring", () => {
  const questionable = {
    data: { columns: { x: ["a", "b", "c"], y: [1, 2, 3] } },
    aes: { x: { field: "x" }, y: { field: "y" } },
    layers: [{ geom: "line", stat: "identity", position: "identity" }],
  };

  it("attaches advisories to an ok result", () => {
    const result = validate(questionable, { lint: true });
    expect(result.ok).toBe(true);
    expect(result.advisories?.map((a) => a.code)).toEqual(["line-over-nominal-x"]);
  });

  it("attaches advisories alongside errors too", () => {
    const broken = { ...questionable, layers: [...questionable.layers, { geom: "pont" }] };
    const result = validate(broken, { lint: true });
    expect(result.ok).toBe(false);
    expect(result.advisories?.map((a) => a.code)).toEqual(["line-over-nominal-x"]);
  });

  it("omits the key without lint: true and when nothing fires", () => {
    expect(validate(questionable, {}).advisories).toBeUndefined();
    const sound = {
      ...questionable,
      data: { columns: { x: [1, 2, 3], y: [1, 2, 3] } },
    };
    expect(validate(sound, { lint: true }).advisories).toBeUndefined();
  });

  it("does not double-scan row-shaped inline data when lint is also on", () => {
    // Instrumented getters: each cell read increments. validate() with lint
    // must pivot/type-scan the rows once (same order of magnitude as without
    // lint), not rebuild columns a second time for lintSpec.
    let accesses = 0;
    const rows = Array.from({ length: 40 }, (_, i) => ({
      get x() {
        accesses++;
        return i % 3 === 0 ? "a" : i % 3 === 1 ? "b" : "c";
      },
      get y() {
        accesses++;
        return i;
      },
    }));
    const spec = {
      data: { values: rows },
      aes: { x: { field: "x" }, y: { field: "y" } },
      layers: [{ geom: "line", stat: "identity", position: "identity" }],
    };

    accesses = 0;
    const withoutLint = validate(spec, {});
    const accessesWithout = accesses;
    expect(withoutLint.ok).toBe(true);

    accesses = 0;
    const withLint = validate(spec, { lint: true });
    const accessesWith = accesses;
    expect(withLint.ok).toBe(true);
    expect(withLint.advisories?.map((a) => a.code)).toEqual(["line-over-nominal-x"]);

    // Without sharing, lint rebuilds columns via a second full row walk (~2×).
    // With one shared pivot, access counts stay comparable.
    expect(accessesWith).toBeLessThanOrEqual(accessesWithout * 1.15);
    expect(accessesWith).toBeGreaterThan(0);
  });
});
