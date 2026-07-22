import { describe, expect, it } from "bun:test";

import { deriveGroups } from "../../src/grouping.ts";
import { positionStack } from "../../src/positions/positions.ts";
import { statBin } from "../../src/stats/bin.ts";

import { load } from "./fixtures.ts";

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
