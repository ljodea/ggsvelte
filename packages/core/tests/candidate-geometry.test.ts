import { describe, expect, it, spyOn } from "bun:test";

import {
  closestOrthInRange,
  directionalNearestInOrder,
  panelRangeInOrder,
  pathRange,
  samePath,
} from "../src/candidate-geometry.ts";
import type { PathsBatch } from "../src/scene.ts";

/** Minimal paths batch with the given offsets and enough vertices. */
function pathsBatch(pathOffsets: readonly number[]): PathsBatch {
  const last = pathOffsets.at(-1) ?? 0;
  return {
    kind: "paths",
    layerIndex: 0,
    panelIndex: 0,
    positions: new Float32Array(Math.max(last, 1) * 2),
    rowIndex: new Uint32Array(Math.max(last, 1)),
    pathOffsets: Uint32Array.from(pathOffsets),
    strokes: Array.from({ length: Math.max(0, pathOffsets.length - 1) }, () => null),
    linewidth: 1,
    alpha: 1,
    curve: "linear",
  };
}

describe("pathRange", () => {
  const offsets = [0, 3, 5, 9] as const;
  const batch = pathsBatch(offsets);

  it("returns first, middle, and last subpath ranges", () => {
    expect(pathRange(batch, 0)).toEqual([0, 3]);
    expect(pathRange(batch, 2)).toEqual([0, 3]);
    expect(pathRange(batch, 3)).toEqual([3, 5]);
    expect(pathRange(batch, 4)).toEqual([3, 5]);
    expect(pathRange(batch, 5)).toEqual([5, 9]);
    expect(pathRange(batch, 8)).toEqual([5, 9]);
  });

  it("returns null for out-of-range vertices and empty offsets", () => {
    expect(pathRange(batch, -1)).toBeNull();
    expect(pathRange(batch, 9)).toBeNull();
    expect(pathRange(batch, 100)).toBeNull();
    expect(pathRange(pathsBatch([]), 0)).toBeNull();
    expect(pathRange(pathsBatch([0]), 0)).toBeNull();
  });

  it("skips zero-length spans and accepts fractional vertices like the linear scan", () => {
    const withEmpty = pathsBatch([0, 2, 2, 5]);
    expect(pathRange(withEmpty, 1)).toEqual([0, 2]);
    // vertex 2 falls in the third span [2, 5) because [2, 2) is empty.
    expect(pathRange(withEmpty, 2)).toEqual([2, 5]);
    expect(pathRange(withEmpty, 1.5)).toEqual([0, 2]);
    expect(pathRange(withEmpty, 2.25)).toEqual([2, 5]);
  });
});

describe("samePath", () => {
  const batch = pathsBatch([0, 4, 7]);

  it("is true for vertices in the same subpath, including ends of the half-open range", () => {
    expect(samePath(batch, 0, 3)).toBe(true);
    expect(samePath(batch, 3, 1)).toBe(true);
    expect(samePath(batch, 4, 6)).toBe(true);
  });

  it("is false across subpath boundaries and for out-of-range seeds", () => {
    expect(samePath(batch, 3, 4)).toBe(false);
    expect(samePath(batch, 0, 4)).toBe(false);
    expect(samePath(batch, -1, 0)).toBe(false);
    expect(samePath(batch, 7, 6)).toBe(false);
  });

  it("treats adjacent vertices on a shared boundary as different subpaths", () => {
    // Vertex 3 is last of first path; vertex 4 is first of second — not samePath.
    expect(samePath(batch, 3, 4)).toBe(false);
    expect(samePath(batch, 4, 3)).toBe(false);
  });
});

describe("closestOrthInRange", () => {
  // permutation is identity; orth/batch/source are per id.
  const ids = (n: number) => Uint32Array.from({ length: n }, (_, i) => i);

  it("returns the only member of a singleton range", () => {
    expect(closestOrthInRange(ids(1), [10], [0], [0], 0, 1, 99)).toBe(0);
  });

  it("picks an exact orth match and the closer of two neighbors", () => {
    const orth = [1, 3, 5, 9];
    const batch = [0, 0, 0, 0];
    const source = [0, 1, 2, 3];
    const perm = ids(4);
    expect(closestOrthInRange(perm, orth, batch, source, 0, 4, 5)).toBe(2);
    // Strictly closer to one neighbor (midpoints are equidistant and use ties).
    expect(closestOrthInRange(perm, orth, batch, source, 0, 4, 4.1)).toBe(2);
    expect(closestOrthInRange(perm, orth, batch, source, 0, 4, 2.1)).toBe(1);
    expect(closestOrthInRange(perm, orth, batch, source, 0, 4, 0)).toBe(0);
    expect(closestOrthInRange(perm, orth, batch, source, 0, 4, 100)).toBe(3);
  });

  it("breaks equidistant orth ties by higher batchId then lower source", () => {
    // target 5: id0 orth=4 (dist1) batch0; id1 orth=6 (dist1) batch2 → batch wins
    expect(closestOrthInRange(ids(2), [4, 6], [0, 2], [0, 0], 0, 2, 5)).toBe(1);
    // same batch: lower source wins
    expect(closestOrthInRange(ids(2), [4, 6], [1, 1], [3, 1], 0, 2, 5)).toBe(1);
    // equal orth run: scan the whole run for best batch/source
    expect(closestOrthInRange(ids(3), [2, 2, 2], [1, 3, 2], [0, 5, 1], 0, 3, 2)).toBe(1);
  });

  it("handles non-finite seedOrth like the linear scan", () => {
    // NaN distances never improve → keep the first member.
    expect(closestOrthInRange(ids(3), [1, 2, 3], [0, 9, 8], [0, 0, 0], 0, 3, Number.NaN)).toBe(0);
    // ±Infinity seed: every finite member has distance Infinity; batch/source ties apply.
    expect(
      closestOrthInRange(ids(3), [1, 2, 3], [0, 9, 8], [0, 0, 0], 0, 3, Number.POSITIVE_INFINITY),
    ).toBe(1); // highest batchId among equal Infinity distances
    expect(
      closestOrthInRange(ids(3), [1, 2, 3], [1, 1, 1], [5, 1, 3], 0, 3, Number.NEGATIVE_INFINITY),
    ).toBe(1); // same batch → lowest source
  });

  it("keeps the first full-tie member on the lower-side equal-orth run", () => {
    // seed 10: both orth 0 have dist 10; identical batch/source → first id wins.
    expect(closestOrthInRange(ids(3), [0, 0, 20], [1, 1, 1], [0, 0, 0], 0, 3, 10)).toBe(0);
  });

  it("picks the largest finite orth when +Infinity follows in the series", () => {
    // seed 50: finite 40 is closer than +Infinity; must not skip past 40.
    expect(
      closestOrthInRange(
        ids(3),
        [10, 40, Number.POSITIVE_INFINITY],
        [0, 0, 0],
        [0, 0, 0],
        0,
        3,
        50,
      ),
    ).toBe(1);
  });

  it("uses O(log M + T) Math.abs probes on a large sorted series", () => {
    // Structural complexity guard: linear scan would call Math.abs ~2*(M-1) times
    // per series (distance + priorDistance). Binary search + tie expand is O(log M).
    const M = 4096;
    const orth = Float32Array.from({ length: M }, (_, i) => i);
    const batch = new Uint32Array(M);
    const source = Uint32Array.from({ length: M }, (_, i) => i);
    const perm = ids(M);
    const absSpy = spyOn(Math, "abs");
    try {
      // Seed orth at the middle of the range (id 2048).
      expect(closestOrthInRange(perm, orth, batch, source, 0, M, 2048)).toBe(2048);
      // log2(4096)=12; allow generous headroom for bound probes + expand.
      expect(absSpy.mock.calls.length).toBeLessThan(64);
      expect(absSpy.mock.calls.length).toBeGreaterThan(0);
    } finally {
      absSpy.mockRestore();
    }
  });
});

describe("directionalNearestInOrder / panelRangeInOrder", () => {
  it("finds nearest in-direction with lower id on full orth ties", () => {
    // order by primary (x): ids at x=0,10,10,20
    const order = [0, 1, 2, 3];
    const primary = [0, 10, 10, 20];
    const orth = [0, 5, 3, 0]; // at x=10, id2 has smaller orth to seed y=0 than id1
    // right from id0 (0,0): nearest primary is x=10; min orth is id2 (3)
    expect(directionalNearestInOrder(order, primary, orth, 0, 4, 0, 0, 0, true)).toBe(2);
    // left from id3: nearest is x=10 run; min orth id2
    expect(directionalNearestInOrder(order, primary, orth, 0, 4, 3, 20, 0, false)).toBe(2);
    // full orth tie at x=10: both orth 5 → lower id
    expect(directionalNearestInOrder(order, primary, [0, 5, 5, 0], 0, 4, 0, 0, 0, true)).toBe(1);
  });

  it("returns seed when nothing lies in-direction or seed primary is non-finite", () => {
    const order = [0, 1];
    const primary = [0, 10];
    const orth = [0, 0];
    expect(directionalNearestInOrder(order, primary, orth, 0, 2, 1, 10, 0, true)).toBe(1);
    expect(directionalNearestInOrder(order, primary, orth, 0, 2, 0, Number.NaN, 0, true)).toBe(0);
  });

  it("probes O(log n + k) order indices on a large single-panel line", () => {
    const n = 4096;
    const order = Uint32Array.from({ length: n }, (_, i) => i);
    const primary = Float32Array.from({ length: n }, (_, i) => i);
    const orth = new Float32Array(n);
    let probes = 0;
    const next = directionalNearestInOrder(order, primary, orth, 0, n, 100, 100, 0, true, () => {
      probes += 1;
    });
    expect(next).toBe(101);
    // log2(4096)=12; equal-primary run k=1; allow headroom for panel/primary bounds.
    expect(probes).toBeLessThan(80);
  });

  it("does not linear-skip a dense seed-primary stack (upper_bound)", () => {
    const stack = 2000;
    const n = stack + 1;
    const order = Uint32Array.from({ length: n }, (_, i) => i);
    const primary = Float32Array.from({ length: n }, (_, i) => (i < stack ? 0 : 1));
    const orth = new Float32Array(n);
    let probes = 0;
    const next = directionalNearestInOrder(order, primary, orth, 0, n, 500, 0, 0, true, () => {
      probes += 1;
    });
    expect(next).toBe(stack);
    expect(probes).toBeLessThan(80);
    expect(probes).toBeLessThan(stack / 2);
  });

  it("panelRangeInOrder isolates a panel segment", () => {
    // order: panel0, panel0, panel1, panel1, panel2
    const order = [0, 1, 2, 3, 4];
    const panels = [0, 0, 1, 1, 2];
    expect(panelRangeInOrder(order, panels, 0)).toEqual([0, 2]);
    expect(panelRangeInOrder(order, panels, 1)).toEqual([2, 4]);
    expect(panelRangeInOrder(order, panels, 2)).toEqual([4, 5]);
    expect(panelRangeInOrder(order, panels, 9)).toEqual([5, 5]);
  });
});
