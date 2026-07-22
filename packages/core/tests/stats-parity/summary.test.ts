import { describe, expect, it } from "bun:test";

import { deriveGroups } from "../../src/grouping.ts";
import { statSummary } from "../../src/stats/summary.ts";

import { load } from "./fixtures.ts";

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
