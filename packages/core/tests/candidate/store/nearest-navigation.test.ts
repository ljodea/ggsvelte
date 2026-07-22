import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import { data, scene } from "../fixtures.ts";

describe("CandidateStore — nearest-navigation", () => {
  const store = buildCandidateStore(scene(), {
    epoch: 7,
    datum: ({ candidateIndex }) => data[candidateIndex]!,
  });

  it("finds dominant-axis and euclidean nearest candidates", () => {
    expect(store.nearest(12, 39, { mode: "x", maxDistance: 3 })?.id).toBe(1);
    expect(store.nearest(48, 31, { mode: "xy", maxDistance: 4 })?.id).toBe(2);
    expect(store.nearest(80, 80, { mode: "xy", maxDistance: 2 })).toBeNull();
  });
  it("excludes invalid logical values from dominant-axis inspection", () => {
    const invalid = [
      ...data.slice(0, 3),
      { xValue: Number.NaN, yValue: 2, seriesId: 9 },
      ...data.slice(3),
    ];
    const withInvalid = scene();
    const points = withInvalid.batches[0]!;
    if (points.kind !== "points") throw new Error("fixture");
    points.positions = new Float32Array([...points.positions, 80, 2]);
    points.rowIndex = new Uint32Array([...points.rowIndex, 5]);
    const invalidStore = buildCandidateStore(withInvalid, {
      datum: ({ candidateIndex }) => invalid[candidateIndex]!,
    });
    expect(invalidStore.nearest(80, 2, { mode: "x", maxDistance: 1 })).toBeNull();
  });
  it("returns a compact canonical bucket and one representative per series", () => {
    const grouped = store.group(1, "x");
    expect(grouped?.axisValue).toEqual(new Date(0));
    expect(grouped?.memberIds).toEqual(new Uint32Array([3, 1]));
    expect(grouped?.focusId).toBe(1);
    expect(grouped?.range.end).toBeGreaterThan(grouped?.range.start ?? 0);
  });
  it("cycles coincident marks, traverses deterministically, and returns integer rect ids", () => {
    // Coincident pair at (10, 25): paint/source order is ids 3 then 4.
    expect(store.cycle(3, 1)).toBe(4);
    expect(store.cycle(4, 1)).toBe(3);
    expect(store.cycle(3, -1)).toBe(4);
    expect(store.cycle(4, -1)).toBe(3);
    expect(store.cycle(3, 2)).toBe(3);
    expect(store.cycle(3, 0)).toBe(3);
    // Singleton stack: step is a no-op (no retained one-element stack required).
    expect(store.cycle(0, 1)).toBe(0);
    expect(store.cycle(0, -3)).toBe(0);
    // Invalid seed returns null (bounds + non-integer, matching other store entry points).
    expect(store.cycle(-1, 1)).toBeNull();
    expect(store.cycle(5, 1)).toBeNull();
    expect(store.cycle(1.5, 1)).toBeNull();
    expect(store.cycle(Number.NaN, 1)).toBeNull();
    // Non-finite / non-integral step falls back to the seed (prior contract).
    expect(store.cycle(3, Number.NaN)).toBe(3);
    expect(store.cycle(3, Number.POSITIVE_INFINITY)).toBe(3);
    expect(store.cycle(3, 1.5)).toBe(3);
    expect(store.traverse(0, "down")).toBe(4);
    expect(store.queryRect(5, 15, 15, 45)).toEqual(new Uint32Array([0, 3, 4, 1]));
  });

  // Traversal order for this fixture (panel → y → x → batch → primitive):
  // [0, 3, 4, 2, 1]
  it("walks next/previous with wrap-around and falls back for unknown start ids", () => {
    expect(store.traverse(null, "next")).toBe(0);
    expect(store.traverse(null, "previous")).toBe(0);
    expect(store.traverse(0, "first")).toBe(0);
    expect(store.traverse(0, "last")).toBe(1);
    expect(store.traverse(0, "next")).toBe(3);
    expect(store.traverse(3, "next")).toBe(4);
    expect(store.traverse(4, "next")).toBe(2);
    expect(store.traverse(2, "next")).toBe(1);
    expect(store.traverse(1, "next")).toBe(0);
    expect(store.traverse(0, "previous")).toBe(1);
    expect(store.traverse(1, "previous")).toBe(2);
    expect(store.traverse(2, "previous")).toBe(4);
    // CandidateStore owns modular keyboard jumps; callers do not materialize
    // traversal order to calculate an index themselves.
    expect(store.traverse(null, "next", 2)).toBe(3);
    expect(store.traverse(0, "next", 3)).toBe(2);
    expect(store.traverse(0, "previous", 2)).toBe(2);
    expect(store.traverse(999, "next")).toBe(0);
    expect(store.traverse(-1, "previous")).toBe(0);
  });
  it("keeps spatial directions independent of sequential rank", () => {
    // Spatial uses geometry, not traversal order.
    expect(store.traverse(0, "down")).toBe(4);
    expect(store.traverse(0, "right")).toBe(2);
    // From (50,30), nearest left is the coincident pair at x=10; topmost id 4 wins.
    expect(store.traverse(2, "left")).toBe(4);
    expect(store.traverse(1, "up")).toBe(2);
  });
});
