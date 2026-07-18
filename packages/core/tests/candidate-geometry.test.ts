import { describe, expect, it } from "bun:test";

import { pathRange, samePath } from "../src/candidate-geometry.ts";
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
