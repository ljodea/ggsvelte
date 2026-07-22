/**
 * Spec-lint advisories (Hadley lesson 16) — each rule fires on its
 * questionable spec, stays silent on the sound variant, and skips without
 * evidence. Also: the validate({ lint: true }) wiring and catalog coverage
 * (every LINT_CATALOG code is exercised here).
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

import { LINT_CATALOG, lintSpec } from "../src/lint.ts";
import type { LintAdvisoryCode } from "../src/lint.ts";
import { DEFAULT_VALIDATE_LIMITS } from "../src/validate-data.ts";
import { validate } from "../src/validate.ts";

const firedCodes = new Set<LintAdvisoryCode>();
const codesOf = (advisories: ReturnType<typeof lintSpec>) => {
  for (const a of advisories) firedCodes.add(a.code);
  return advisories.map((a) => a.code);
};

describe("line-over-nominal-x", () => {
  const spec = (x: unknown[]) => ({
    data: { columns: { x, y: [1, 2, 3] } },
    aes: { x: { field: "x" }, y: { field: "y" } },
    layers: [{ geom: "line" }],
  });

  it("fires on nominal x", () => {
    const advisories = lintSpec(spec(["cat", "dog", "bird"]));
    expect(codesOf(advisories)).toContain("line-over-nominal-x");
    expect(advisories[0]!.path).toBe("/layers/0/aes/x");
    expect(advisories[0]!.suggestion?.example).toEqual({ geom: "col" });
  });

  it("silent on quantitative or temporal x", () => {
    expect(lintSpec(spec([1, 2, 3]))).toEqual([]);
    expect(lintSpec(spec(["2024-01-01", "2024-01-02", "2024-01-03"]))).toEqual([]);
  });

  it("fires from a DataProfile too, and respects ordinal as ordered", () => {
    const bare = {
      aes: { x: { field: "grade" }, y: { field: "n" } },
      layers: [{ geom: "line" }],
    };
    const nominal = lintSpec(bare, {
      profile: {
        fields: [
          { name: "grade", type: "nominal" },
          { name: "n", type: "quantitative" },
        ],
      },
    });
    expect(codesOf(nominal)).toContain("line-over-nominal-x");
    const ordinal = lintSpec(bare, {
      profile: {
        fields: [
          { name: "grade", type: "ordinal" },
          { name: "n", type: "quantitative" },
        ],
      },
    });
    expect(ordinal).toEqual([]);
  });

  it("skips without evidence (no data, no profile)", () => {
    expect(
      lintSpec({ aes: { x: { field: "x" }, y: { field: "y" } }, layers: [{ geom: "line" }] }),
    ).toEqual([]);
  });
});

describe("discrete-discrete-scatter", () => {
  const spec = (position?: string) => ({
    data: { columns: { a: ["x", "y", "x"], b: ["u", "u", "v"] } },
    aes: { x: { field: "a" }, y: { field: "b" } },
    layers: [{ geom: "point", ...(position !== undefined && { position }) }],
  });

  it("fires on discrete×discrete points and suggests jitter", () => {
    const advisories = lintSpec(spec());
    expect(codesOf(advisories)).toContain("discrete-discrete-scatter");
    expect(advisories[0]!.suggestion?.example).toEqual({ geom: "point", position: "jitter" });
  });

  it("silent when already jittered, or when one axis is continuous", () => {
    expect(lintSpec(spec("jitter"))).toEqual([]);
    const continuous = {
      data: { columns: { a: ["x", "y", "x"], b: [1, 2, 3] } },
      aes: { x: { field: "a" }, y: { field: "b" } },
      layers: [{ geom: "point" }],
    };
    expect(lintSpec(continuous)).toEqual([]);
  });
});

describe("stacked-area-negative", () => {
  const spec = (y: number[], position?: string) => ({
    data: { columns: { x: [1, 2, 3], y, g: ["a", "b", "a"] } },
    aes: { x: { field: "x" }, y: { field: "y" }, fill: { field: "g" } },
    layers: [{ geom: "area", ...(position !== undefined && { position }) }],
  });

  it("fires on stacked (default) and fill positions with negative y", () => {
    expect(codesOf(lintSpec(spec([1, -2, 3])))).toContain("stacked-area-negative");
    expect(codesOf(lintSpec(spec([1, -2, 3], "fill")))).toContain("stacked-area-negative");
  });

  it("silent for identity position or all-positive y", () => {
    expect(lintSpec(spec([1, -2, 3], "identity"))).toEqual([]);
    expect(lintSpec(spec([1, 2, 3]))).toEqual([]);
  });
});

describe("many-discrete-colors", () => {
  const categories = (n: number) => Array.from({ length: n }, (_, i) => `cat-${i}`);
  const spec = (n: number) => ({
    data: { columns: { x: categories(n).map((_, i) => i), g: categories(n) } },
    aes: { x: { field: "x" }, y: { field: "x" }, color: { field: "g" } },
    layers: [{ geom: "point" }],
  });

  it("fires above 10 distinct values with a facet suggestion", () => {
    const advisories = lintSpec(spec(11));
    expect(codesOf(advisories)).toContain("many-discrete-colors");
    expect(advisories[0]!.message).toContain("11 distinct");
    expect(advisories[0]!.suggestion?.example).toEqual({ facet: { wrap: { field: "g" } } });
  });

  it("silent at exactly 10", () => {
    expect(lintSpec(spec(10))).toEqual([]);
  });

  /**
   * Characterization for distinct-count memoization: shared fields must still
   * emit one advisory per layer/channel path with the same count, while the
   * column is scanned once underneath.
   */
  it("emits per-layer advisories for a shared high-cardinality color field", () => {
    const g = categories(12);
    const advisories = lintSpec({
      data: { columns: { x: g.map((_, i) => i), g } },
      aes: { x: { field: "x" }, y: { field: "x" }, color: { field: "g" } },
      layers: [{ geom: "point" }, { geom: "line" }],
    }).filter((a) => a.code === "many-discrete-colors");
    expect(advisories).toHaveLength(2);
    expect(advisories.map((a) => a.path)).toEqual(["/layers/0/aes/color", "/layers/1/aes/color"]);
    expect(advisories.every((a) => a.message.includes("12 distinct"))).toBe(true);
  });

  it("reuses plot-aes color and still fires for color and fill on the same field", () => {
    const g = categories(15);
    const advisories = lintSpec({
      data: { columns: { x: g.map((_, i) => i), g } },
      aes: { x: { field: "x" }, y: { field: "x" }, color: { field: "g" }, fill: { field: "g" } },
      layers: [{ geom: "point" }, { geom: "col", aes: { x: { field: "x" }, y: { field: "x" } } }],
    }).filter((a) => a.code === "many-discrete-colors");
    // Two layers × color (inherited) + fill (plot aes) on first layer only when
    // fill is mapped: point and col both inherit color; both inherit fill.
    expect(advisories.length).toBeGreaterThanOrEqual(2);
    expect(advisories.every((a) => a.message.includes("15 distinct"))).toBe(true);
    expect(advisories.some((a) => a.path.endsWith("/color"))).toBe(true);
    expect(advisories.some((a) => a.path.endsWith("/fill"))).toBe(true);
  });
});

describe("transform-domain-data", () => {
  const spec = (y: number[], scaleY: Record<string, unknown>) => ({
    data: { columns: { x: y.map((_, i) => i + 1), y } },
    aes: { x: { field: "x" }, y: { field: "y" } },
    layers: [{ geom: "point" }],
    scales: { y: scaleY },
  });

  it("fires on mixed-sign data under an authored type:log scale (pre-normalization)", () => {
    const advisories = lintSpec(spec([5, -1, 0, 10], { type: "log" }));
    expect(codesOf(advisories)).toContain("transform-domain-data");
    expect(advisories[0]!.path).toBe("/scales/y");
    // log10 rejects <= 0: both -1 and 0 are out of the transform domain.
    expect(advisories[0]!.message).toContain("2");
  });

  it("fires on canonical transform:log10 (type:linear) with mixed-sign data", () => {
    const advisories = lintSpec(spec([5, -1, 0, 10], { type: "linear", transform: "log10" }));
    expect(codesOf(advisories)).toContain("transform-domain-data");
  });

  it("fires on transform:sqrt when data mixes negative and non-negative values", () => {
    // sqrt rejects < 0 only: 0 is a valid sqrt input, -4 is not.
    const advisories = lintSpec(spec([4, -4, 0, 9], { type: "linear", transform: "sqrt" }));
    expect(codesOf(advisories)).toContain("transform-domain-data");
    expect(advisories[0]!.message).toContain("1");
  });

  it("silent for all-in-domain data or an untransformed scale", () => {
    expect(lintSpec(spec([1, 2, 3], { type: "log" }))).toEqual([]);
    // sqrt: zero is valid, so all-non-negative is silent.
    expect(lintSpec(spec([0, 4, 9], { type: "linear", transform: "sqrt" }))).toEqual([]);
    expect(lintSpec(spec([5, -1, 10], { type: "linear" }))).toEqual([]);
    // all-invalid (no positive companion) is the pipeline's error/warning, not
    // this mixed-data advisory.
    expect(lintSpec(spec([-1, -2, 0], { type: "log" }))).toEqual([]);
  });

  /**
   * Characterization for field-scan memoization (#425): multi-layer reuse of
   * the same mapped field under a transform scale must keep one advisory per
   * axis with stable counts, including plot-aes inheritance.
   */
  it("emits one advisory with stable counts when multiple layers share a mixed field", () => {
    const advisories = lintSpec({
      data: { columns: { x: [1, 2, 3, 4], y: [5, -1, 0, 10] } },
      aes: { x: { field: "x" }, y: { field: "y" } },
      scales: { y: { type: "log" } },
      layers: [{ geom: "point" }, { geom: "line" }, { geom: "smooth" }],
    });
    expect(codesOf(advisories)).toEqual(["transform-domain-data"]);
    expect(advisories[0]!.path).toBe("/scales/y");
    // log10: -1 and 0 out of domain; 5 and 10 in domain.
    expect(advisories[0]!.message).toContain("2 value(s) outside");
    expect(advisories[0]!.message).toContain("2 valid");
  });

  it("reuses plot-level aes y across layers when scanning transform domain", () => {
    const advisories = lintSpec({
      data: { columns: { x: [1, 2, 3], y: [4, -4, 9] } },
      aes: { x: { field: "x" }, y: { field: "y" } },
      scales: { y: { type: "linear", transform: "sqrt" } },
      // Layer aes omit y so effectiveChannel falls back to plot aes.
      layers: [{ geom: "point" }, { geom: "line", aes: { x: { field: "x" } } }],
    });
    expect(codesOf(advisories)).toEqual(["transform-domain-data"]);
    expect(advisories[0]!.message).toContain('field "y"');
    expect(advisories[0]!.message).toContain("1 value(s) outside");
  });

  it("keeps first-hit field ordering when an earlier mixed field wins", () => {
    const advisories = lintSpec({
      data: {
        columns: {
          early: [5, -1, 10],
          late: [1, -2, 3],
          x: [1, 2, 3],
        },
      },
      scales: { y: { type: "log" } },
      layers: [
        { geom: "point", aes: { x: { field: "x" }, y: { field: "early" } } },
        { geom: "line", aes: { x: { field: "x" }, y: { field: "late" } } },
      ],
    });
    expect(codesOf(advisories)).toEqual(["transform-domain-data"]);
    // First mixed field encountered is "early" (1 out of domain: -1).
    expect(advisories[0]!.message).toContain('field "early"');
    expect(advisories[0]!.message).toContain("1 value(s) outside");
    expect(advisories[0]!.message).not.toContain('field "late"');
  });
});

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

describe("LINT_CATALOG coverage", () => {
  it("every cataloged advisory code fired in this suite", () => {
    expect([...firedCodes].toSorted()).toEqual(Object.keys(LINT_CATALOG).toSorted());
  });

  it("source-scan: every code emitted by lint.ts is cataloged and vice-versa (bijective)", () => {
    // Mirror of core's source↔catalog scanner: scan the lint source for every
    // `code: "..."` literal actually emitted, and prove it matches LINT_CATALOG
    // exactly — no retired code lingers, no cataloged code is unemitted.
    const src = readFileSync(new URL("../src/lint.ts", import.meta.url), "utf8");
    const emitted = new Set<string>();
    for (const m of src.matchAll(/\bcode:\s*"([a-z0-9-]+)"/g)) emitted.add(m[1]!);
    expect([...emitted].toSorted()).toEqual(Object.keys(LINT_CATALOG).toSorted());
    // The retired late-log codes must not survive anywhere in the source.
    expect(src).not.toContain("log-nonpositive-data");
    expect(src).not.toContain("log-domain-not-positive");
  });
});
