import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { deriveGroups } from "../../src/grouping.ts";
import { statBoxplot } from "../../src/stats/boxplot.ts";

import { load } from "./fixtures.ts";

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
        const want = Array.isArray(row.outliers) ? row.outliers : [fromAny<number>(row.outliers)];
        expect(got.length).toBe(want.length);
        for (let j = 0; j < want.length; j++) expect(got[j]!).toBeCloseTo(want[j]!, 9);
      }
    });
  }
});
