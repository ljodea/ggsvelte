/**
 * stat_ydensity — violin width generation.
 */
import { describe, expect, it } from "bun:test";
import { statYDensity } from "../../src/stats/ydensity.ts";

describe("statYDensity", () => {
  it("emits one grid per x category with positive violinwidth", () => {
    const y = Float64Array.from([1, 2, 2.5, 3, 10, 11, 11.5, 12]);
    const x = ["a", "a", "a", "a", "b", "b", "b", "b"];
    const groups = [0, 0, 0, 0, 0, 0, 0, 0];
    const result = statYDensity({
      y,
      x,
      groups,
      params: { n: 32, scale: "width", trim: true },
    });
    expect(result.y.length).toBe(64); // 2 cats × 32
    expect(result.x.filter((v) => v === "a").length).toBe(32);
    expect(result.x.filter((v) => v === "b").length).toBe(32);
    expect(Math.max(...result.violinwidth)).toBeCloseTo(1, 5);
    expect(Math.min(...result.violinwidth)).toBeGreaterThanOrEqual(0);
  });

  it("drops groups with fewer than two points", () => {
    const result = statYDensity({
      y: Float64Array.from([1, 2, 3, 9]),
      x: ["a", "a", "a", "lonely"],
      groups: [0, 0, 0, 0],
      params: { n: 16, trim: true },
    });
    expect(result.droppedGroups).toBe(1);
    expect(new Set(result.x)).toEqual(new Set(["a"]));
  });

  it("scale count widens larger-n violins", () => {
    const y = Float64Array.from([
      ...Array.from({ length: 20 }, (_, i) => i),
      ...Array.from({ length: 4 }, (_, i) => i),
    ]);
    const x = [
      ...Array.from({ length: 20 }, () => "big"),
      ...Array.from({ length: 4 }, () => "small"),
    ];
    const groups = Array.from({ length: 24 }, () => 0);
    const result = statYDensity({
      y,
      x,
      groups,
      params: { n: 16, scale: "count", trim: true },
    });
    const maxBig = Math.max(...result.violinwidth.filter((_, i) => result.x[i] === "big"));
    const maxSmall = Math.max(...result.violinwidth.filter((_, i) => result.x[i] === "small"));
    expect(maxBig).toBeGreaterThan(maxSmall);
  });
});
