/**
 * ggplot2/R parity for the M2 statistical layer, against the R-generated
 * fixtures in tests/fixtures/stats (regenerate with
 * `Rscript packages/core/tests/fixtures/stats/generate.R`).
 *
 * Tolerances (measured, decision 0010):
 *  - qt / lm / loess(surface="direct", statistics="exact"): float noise —
 *    asserted at 1e-9 (measured ≤ ~2e-13 abs).
 *  - loess vs ggplot2's DEFAULT loess (surface="interpolate",
 *    statistics="approximate"): the interpolation/approximation gap —
 *    measured max relative deviation 0.53% (fit), 0.94% (band), 3.4% (se);
 *    asserted at 1% / 1.5% / 4% relative.
 *  - density vs R's binned-FFT stats::density(): ggsvelte sums the kernel
 *    directly (exact); measured max relative deviation ~2.6e-4; asserted at
 *    5e-4 relative. Bandwidth (bw.nrd0) and grid endpoints are exact (1e-9).
 *  - bin / boxplot / summary: exact algorithms — 1e-9.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { deriveGroups } from "../src/grouping.ts";
import { positionStack } from "../src/positions/positions.ts";
import { statBin } from "../src/stats/bin.ts";
import { statBoxplot } from "../src/stats/boxplot.ts";
import { bwNRD0, statDensity } from "../src/stats/density.ts";
import { qt } from "../src/stats/numeric.ts";
import { statSmooth } from "../src/stats/smooth.ts";
import { statSummary } from "../src/stats/summary.ts";
import type { CellValue } from "../src/table.ts";

const dir = join(import.meta.dir, "fixtures", "stats");

interface Fixture {
  case: string;
  data: Record<string, CellValue[]>;
  expected: Record<string, number | string | number[]>[];
}

function load<T = Fixture>(name: string): T {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
}

/** Max |a - b| relative to the max |expected| (band-scale-aware tolerance). */
function maxRelDiff(expected: number[], actual: ArrayLike<number>): number {
  let scale = 0;
  for (const v of expected) scale = Math.max(scale, Math.abs(v));
  let rel = 0;
  for (let i = 0; i < expected.length; i++) {
    rel = Math.max(rel, Math.abs(expected[i]! - (actual[i] as number)) / (scale || 1));
  }
  return rel;
}

describe("qt — R parity", () => {
  it("matches R's qt over the smooth stat's p/df grid", () => {
    const fixture = load<{ expected: { p: number; df: number; q: number }[] }>(
      "60-qt-reference.json",
    );
    for (const row of fixture.expected) {
      expect(Math.abs(qt(row.p, row.df) - row.q)).toBeLessThan(1e-9);
    }
  });
});

describe("bin stat — ggplot2 parity (R fixtures)", () => {
  const singleGroupCases: [
    string,
    { binwidth?: number; boundary?: number; center?: number; closed?: "left" | "right" },
    boolean,
  ][] = [
    ["10-bin-default-bins.json", {}, false],
    ["11-bin-binwidth-boundary.json", { binwidth: 1.25, boundary: 0 }, false],
    ["12-bin-binwidth-center.json", { binwidth: 1.25, center: 0 }, false],
    ["13-bin-closed-left.json", { binwidth: 2, boundary: 0, closed: "left" }, false],
    ["14-bin-edges-closed-right.json", { binwidth: 1, boundary: 0 }, false],
    ["15-bin-edges-closed-left.json", { binwidth: 1, boundary: 0, closed: "left" }, false],
    ["16-bin-weighted.json", { binwidth: 2, boundary: 0 }, true],
  ];

  for (const [name, params, weighted] of singleGroupCases) {
    it(name, () => {
      const fixture = load(name);
      const x = Float64Array.from(fixture.data["x"] as number[]);
      const result = statBin({
        x,
        groups: Array.from({ length: x.length }, () => 0),
        weights: weighted ? Float64Array.from(fixture.data["w"] as number[]) : null,
        params,
      });
      expect(result.x.length).toBe(fixture.expected.length);
      for (let i = 0; i < fixture.expected.length; i++) {
        const row = fixture.expected[i]!;
        expect(result.x[i]!).toBeCloseTo(row["x"] as number, 9);
        expect(result.xmin[i]!).toBeCloseTo(row["xmin"] as number, 9);
        expect(result.xmax[i]!).toBeCloseTo(row["xmax"] as number, 9);
        expect(result.count[i]!).toBeCloseTo(row["count"] as number, 9);
        expect(result.density[i]!).toBeCloseTo(row["density"] as number, 9);
        expect(result.ncount[i]!).toBeCloseTo(row["ncount"] as number, 9);
        expect(result.ndensity[i]!).toBeCloseTo(row["ndensity"] as number, 9);
      }
      expect(result.usedDefaultBins).toBe(name === "10-bin-default-bins.json");
    });
  }

  it("17: per-group counting over SHARED breaks, ggplot2 stack parity", () => {
    const fixture = load("17-bin-grouped-stack.json");
    const x = Float64Array.from(fixture.data["x"] as number[]);
    const g = fixture.data["g"]!;
    const groups = [
      ...deriveGroups({ x: fixture.data["x"]!, g }, { x: { field: "x" }, fill: { field: "g" } })
        .groups,
    ];
    const carried = { g };
    const result = statBin({ x, groups, carried, params: { binwidth: 2.5, boundary: 0 } });
    const { ymin, ymax } = positionStack({
      slots: Array.from(result.x),
      groups: result.groups,
      y: result.count,
      mode: "stack",
    });

    const actual = new Map(
      Array.from(result.x, (center, i) => [
        `${String(result.carried["g"]![i])}|${center.toFixed(6)}`,
        {
          xmin: result.xmin[i]!,
          xmax: result.xmax[i]!,
          count: result.count[i]!,
          ymin: ymin[i]!,
          ymax: ymax[i]!,
        },
      ]),
    );
    expect(actual.size).toBe(fixture.expected.length);
    for (const row of fixture.expected) {
      const got = actual.get(`${String(row["g"])}|${(row["x"] as number).toFixed(6)}`);
      expect(got).toBeDefined();
      expect(got!.xmin).toBeCloseTo(row["xmin"] as number, 9);
      expect(got!.xmax).toBeCloseTo(row["xmax"] as number, 9);
      expect(got!.count).toBeCloseTo(row["count"] as number, 9);
      expect(got!.ymin).toBeCloseTo(row["stackYmin"] as number, 9);
      expect(got!.ymax).toBeCloseTo(row["stackYmax"] as number, 9);
    }
  });
});

interface SmoothExpected {
  x: number;
  y: number;
  ymin: number;
  ymax: number;
  se: number;
}

describe("smooth stat — R parity (fixtures)", () => {
  const cases: [
    string,
    { method: "lm" | "loess"; level?: number; n?: number; span?: number; degree?: 1 | 2 },
    { y: number; band: number; se: number },
  ][] = [
    // lm + loess(direct/exact): analytic parity, float noise only.
    [
      "20-smooth-lm-se.json",
      { method: "lm", level: 0.95, n: 80 },
      { y: 1e-9, band: 1e-9, se: 1e-9 },
    ],
    [
      "21-smooth-lm-level99.json",
      { method: "lm", level: 0.99, n: 40 },
      { y: 1e-9, band: 1e-9, se: 1e-9 },
    ],
    [
      "23-smooth-loess-direct-exact.json",
      { method: "loess", n: 80, span: 0.75, degree: 2 },
      { y: 1e-9, band: 1e-9, se: 1e-9 },
    ],
    [
      "24-smooth-loess-degree1-span04.json",
      { method: "loess", n: 60, span: 0.4, degree: 1 },
      { y: 1e-9, band: 1e-9, se: 1e-9 },
    ],
    // ggplot2's default loess path (interpolate/approximate): the honest,
    // measured tolerance (decision 0010).
    [
      "22-smooth-loess-default.json",
      { method: "loess", n: 80, span: 0.75, degree: 2 },
      { y: 0.01, band: 0.015, se: 0.04 },
    ],
  ];

  for (const [name, params, tol] of cases) {
    it(`${name} (rel tol y ${tol.y}, band ${tol.band}, se ${tol.se})`, () => {
      const fixture = load<{ data: { x: number[]; y: number[] }; expected: SmoothExpected[] }>(
        name,
      );
      const x = Float64Array.from(fixture.data.x);
      const y = Float64Array.from(fixture.data.y);
      const result = statSmooth({
        x,
        y,
        groups: Array.from({ length: x.length }, () => 0),
        params,
      });
      const expected = fixture.expected;
      expect(result.x.length).toBe(expected.length);
      expect(
        maxRelDiff(
          expected.map((e) => e.x),
          result.x,
        ),
      ).toBeLessThan(1e-9);
      expect(
        maxRelDiff(
          expected.map((e) => e.y),
          result.y,
        ),
      ).toBeLessThan(tol.y);
      expect(
        maxRelDiff(
          expected.map((e) => e.ymin),
          result.ymin,
        ),
      ).toBeLessThan(tol.band);
      expect(
        maxRelDiff(
          expected.map((e) => e.ymax),
          result.ymax,
        ),
      ).toBeLessThan(tol.band);
      expect(
        maxRelDiff(
          expected.map((e) => e.se),
          result.se,
        ),
      ).toBeLessThan(tol.se);
    });
  }
});

interface BoxExpected {
  x: string;
  ymin: number;
  lower: number;
  middle: number;
  upper: number;
  ymax: number;
  outliers: number[];
}

describe("boxplot stat — ggplot2 parity (R fixtures)", () => {
  for (const [name, coef] of [
    ["30-boxplot-basic.json", undefined],
    ["31-boxplot-coef05.json", 0.5],
  ] as const) {
    it(name, () => {
      const fixture = load<{ data: { x: string[]; y: number[] }; expected: BoxExpected[] }>(name);
      const groups = [
        ...deriveGroups(
          { x: fixture.data.x, y: fixture.data.y },
          { x: { field: "x" }, y: { field: "y" } },
        ).groups,
      ];
      const result = statBoxplot({
        x: fixture.data.x,
        y: Float64Array.from(fixture.data.y),
        groups,
        ...(coef !== undefined && { coef }),
      });
      expect(result.x.length).toBe(fixture.expected.length);
      const byX = new Map(result.x.map((x, i) => [String(x), i]));
      for (const row of fixture.expected) {
        const i = byX.get(row.x)!;
        expect(i).toBeDefined();
        expect(result.ymin[i]!).toBeCloseTo(row.ymin, 9);
        expect(result.lower[i]!).toBeCloseTo(row.lower, 9);
        expect(result.middle[i]!).toBeCloseTo(row.middle, 9);
        expect(result.upper[i]!).toBeCloseTo(row.upper, 9);
        expect(result.ymax[i]!).toBeCloseTo(row.ymax, 9);
        const got = result.outliers
          .filter((o) => o.boxRow === i)
          .map((o) => o.y)
          .toSorted((a, b) => a - b);
        const want = Array.isArray(row.outliers)
          ? row.outliers
          : [row.outliers as unknown as number];
        expect(got.length).toBe(want.length);
        for (let j = 0; j < want.length; j++) expect(got[j]!).toBeCloseTo(want[j]!, 9);
      }
    });
  }
});

interface SummaryExpected {
  x: string;
  y: number;
  ymin: number;
  ymax: number;
}

describe("summary stat — ggplot2 parity (R fixtures)", () => {
  for (const [name, funs] of [
    ["40-summary-mean-se.json", {}],
    ["41-summary-median-min-max.json", { fun: "median", funMin: "min", funMax: "max" }],
  ] as const) {
    it(name, () => {
      const fixture = load<{ data: { x: string[]; y: number[] }; expected: SummaryExpected[] }>(
        name,
      );
      const groups = [
        ...deriveGroups(
          { x: fixture.data.x, y: fixture.data.y },
          { x: { field: "x" }, y: { field: "y" } },
        ).groups,
      ];
      const result = statSummary({
        x: fixture.data.x,
        y: Float64Array.from(fixture.data.y),
        groups,
        ...funs,
      });
      expect(result.x.length).toBe(fixture.expected.length);
      const byX = new Map(result.x.map((x, i) => [String(x), i]));
      for (const row of fixture.expected) {
        const i = byX.get(row.x)!;
        expect(i).toBeDefined();
        expect(result.y[i]!).toBeCloseTo(row.y, 9);
        expect(result.ymin[i]!).toBeCloseTo(row.ymin, 9);
        expect(result.ymax[i]!).toBeCloseTo(row.ymax, 9);
      }
    });
  }
});

interface DensityFixture {
  data: { x: number[] };
  expected: {
    bw: number;
    from: number;
    to: number;
    x: number[];
    density: number[];
    count: number[];
    scaled: number[];
  };
}

describe("density stat — R stats::density parity (fixtures)", () => {
  const cases: [string, { n?: number; bw?: number }][] = [
    ["50-density-basic.json", {}],
    ["51-density-bw-adjust.json", { n: 256, bw: 0.3 }],
    ["52-density-group2.json", {}],
  ];
  for (const [name, params] of cases) {
    it(`${name} (direct summation vs R's FFT: rel tol 5e-4)`, () => {
      const fixture = load<DensityFixture>(name);
      const x = Float64Array.from(fixture.data.x);
      const result = statDensity({
        x,
        groups: Array.from({ length: x.length }, () => 0),
        params,
      });
      const expected = fixture.expected;
      expect(result.x.length).toBe(expected.x.length);
      // Bandwidth + grid endpoints are exact.
      if (params.bw === undefined) {
        expect(bwNRD0(Float64Array.from(x).toSorted())).toBeCloseTo(expected.bw, 9);
      }
      expect(result.x[0]!).toBeCloseTo(expected.from, 9);
      expect(result.x.at(-1)!).toBeCloseTo(expected.to, 9);
      // The KDE itself: R approximates by binned FFT; ggsvelte is exact.
      expect(maxRelDiff(expected.density, result.density)).toBeLessThan(5e-4);
      expect(maxRelDiff(expected.count, result.count)).toBeLessThan(5e-4);
      expect(maxRelDiff(expected.scaled, result.scaled)).toBeLessThan(5e-4);
    });
  }
});
