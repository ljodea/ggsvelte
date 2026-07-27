/**
 * Pure stat_connect unit tests (#816) — exact vertex expansion literals.
 */
import { describe, expect, it } from "bun:test";

import { expandSegment, statConnect } from "../src/stats/connect.js";

describe("expandSegment", () => {
  it("hv: horizontal then vertical corner", () => {
    expect(expandSegment(0, 0, 2, 4, "hv")).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 4 },
    ]);
  });

  it("vh: vertical then horizontal corner", () => {
    expect(expandSegment(0, 0, 2, 4, "vh")).toEqual([
      { x: 0, y: 4 },
      { x: 2, y: 4 },
    ]);
  });

  it("mid: two corners at midpoint x", () => {
    expect(expandSegment(0, 0, 2, 4, "mid")).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
    ]);
  });

  it("linear: endpoint only", () => {
    expect(expandSegment(0, 0, 2, 4, "linear")).toEqual([{ x: 2, y: 4 }]);
  });
});

describe("statConnect", () => {
  it("hv on 3 points emits first point plus corners (5 rows)", () => {
    // Points: (0,0) → (2,2) → (4,0). hv corners at (2,0) and (4,2).
    const result = statConnect({
      x: Float64Array.from([0, 2, 4]),
      y: Float64Array.from([0, 2, 0]),
      groups: [0, 0, 0],
      connection: "hv",
      carried: { c: ["a", "b", "c"] },
    });
    expect(Array.from(result.x)).toEqual([0, 2, 2, 4, 4]);
    expect(Array.from(result.y)).toEqual([0, 0, 2, 2, 0]);
    expect(result.groups).toEqual([0, 0, 0, 0, 0]);
    // Intermediates carry from A of each segment; endpoints from themselves.
    expect(result.carried.c).toEqual(["a", "a", "b", "b", "c"]);
    expect(result.dropped).toBe(0);
  });

  it("defaults connection to hv when omitted", () => {
    const result = statConnect({
      x: Float64Array.from([0, 1]),
      y: Float64Array.from([0, 1]),
      groups: [0, 0],
      carried: {},
    });
    expect(Array.from(result.x)).toEqual([0, 1, 1]);
    expect(Array.from(result.y)).toEqual([0, 0, 1]);
  });

  it("linear equals identity vertices on path order", () => {
    const result = statConnect({
      x: Float64Array.from([0, 1, 2]),
      y: Float64Array.from([3, 4, 5]),
      groups: [0, 0, 0],
      connection: "linear",
      carried: {},
    });
    expect(Array.from(result.x)).toEqual([0, 1, 2]);
    expect(Array.from(result.y)).toEqual([3, 4, 5]);
  });

  it("isolates groups and preserves group order", () => {
    const result = statConnect({
      x: Float64Array.from([0, 1, 0, 1]),
      y: Float64Array.from([0, 1, 2, 3]),
      groups: [1, 1, 0, 0],
      connection: "linear",
      carried: {},
    });
    // Groups emitted in first-seen order (1 then 0), not sorted.
    expect(result.groups).toEqual([1, 1, 0, 0]);
    expect(Array.from(result.x)).toEqual([0, 1, 0, 1]);
    expect(Array.from(result.y)).toEqual([0, 1, 2, 3]);
  });

  it("drops non-finite rows and reconnects remaining successive finite points", () => {
    const result = statConnect({
      x: Float64Array.from([0, Number.NaN, 2]),
      y: Float64Array.from([0, 1, 2]),
      groups: [0, 0, 0],
      connection: "linear",
      carried: {},
    });
    expect(result.dropped).toBe(1);
    expect(Array.from(result.x)).toEqual([0, 2]);
    expect(Array.from(result.y)).toEqual([0, 2]);
  });

  it("single-point group passes through unchanged", () => {
    const result = statConnect({
      x: Float64Array.from([5]),
      y: Float64Array.from([9]),
      groups: [0],
      connection: "hv",
      carried: { c: ["solo"] },
    });
    expect(Array.from(result.x)).toEqual([5]);
    expect(Array.from(result.y)).toEqual([9]);
    expect(result.carried.c).toEqual(["solo"]);
  });

  it("sorts by x within group when sortByX is true (line)", () => {
    const result = statConnect({
      x: Float64Array.from([2, 0]),
      y: Float64Array.from([2, 0]),
      groups: [0, 0],
      connection: "hv",
      sortByX: true,
      carried: {},
    });
    // After x-sort: (0,0) → (2,2) → hv expands to (0,0),(2,0),(2,2)
    expect(Array.from(result.x)).toEqual([0, 2, 2]);
    expect(Array.from(result.y)).toEqual([0, 0, 2]);
  });
});
