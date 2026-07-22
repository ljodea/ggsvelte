import { describe, expect, it } from "bun:test";

import { statSmooth } from "../../src/stats/smooth.ts";

import { load, maxRelDiff } from "./fixtures.ts";

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
