/**
 * Spec-lint advisories (Hadley lesson 16) — each rule fires on its
 * questionable spec, stays silent on the sound variant, and skips without
 * evidence. Also: the validate({ lint: true }) wiring and catalog coverage
 * (every LINT_CATALOG code is exercised here).
 */
import { describe, expect, it } from "bun:test";

import { LINT_CATALOG, lintSpec } from "../src/lint.ts";
import type { LintAdvisoryCode } from "../src/lint.ts";
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
});

describe("log-nonpositive-data", () => {
  const spec = (y: number[], type = "log") => ({
    data: { columns: { x: y.map((_, i) => i + 1), y } },
    aes: { x: { field: "x" }, y: { field: "y" } },
    layers: [{ geom: "point" }],
    scales: { y: { type } },
  });

  it("fires on mixed-sign data under a log scale", () => {
    const advisories = lintSpec(spec([5, -1, 0, 10]));
    expect(codesOf(advisories)).toContain("log-nonpositive-data");
    expect(advisories[0]!.path).toBe("/scales/y");
    expect(advisories[0]!.message).toContain("2 non-positive");
  });

  it("silent for all-positive data or a linear scale", () => {
    expect(lintSpec(spec([1, 2, 3]))).toEqual([]);
    expect(lintSpec(spec([5, -1, 10], "linear"))).toEqual([]);
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
});
