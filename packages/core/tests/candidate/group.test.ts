import { describe, expect, it, spyOn } from "bun:test";

import { buildCandidateStore } from "../../src/candidate-store.ts";
import { sceneWithPoints } from "./fixtures.ts";

describe("candidate grouping hot path", () => {
  it("uses preordered series boundaries without sorting during resolution", () => {
    const plotScene = sceneWithPoints([
      [10, 30],
      [10, 10],
      [10, 20],
    ]);
    const store = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: 1,
        yValue: primitiveIndex,
        seriesId: primitiveIndex,
        seriesRank: 2 - primitiveIndex,
      }),
    });
    // Force the lazy construction/sort boundary before policing resolution.
    void store.x;
    const sortSpy = spyOn(Array.prototype, "toSorted").mockImplementation(function () {
      throw new Error("group resolution sorted");
    });
    try {
      expect([...store.group(0, "x")!.memberIds]).toEqual([2, 1, 0]);
    } finally {
      sortSpy.mockRestore();
    }
  });

  it("does not produce an axis target for an invalid logical bucket", () => {
    const plotScene = sceneWithPoints([[10, 10]]);
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: Number.NaN, yValue: 1 }),
    });
    expect(store.group(0, "x")).toBeNull();
    expect(store.nearest(10, 10, { mode: "x", maxDistance: 100 })).toBeNull();
  });

  it("keeps the seed as its own series representative", () => {
    const plotScene = sceneWithPoints([
      [10, 10],
      [10, 50],
      [10, 30],
    ]);
    // Two series at the same x: seed series 0 has two points; series 1 has one.
    const store = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: "a",
        yValue: primitiveIndex * 10,
        seriesId: primitiveIndex === 1 ? 1 : 0,
        seriesRank: primitiveIndex === 1 ? 1 : 0,
      }),
    });
    const grouped = store.group(2, "x");
    expect(grouped).not.toBeNull();
    // Seed id 2 is series 0; that series' member must stay the seed (not the
    // orth-closest sibling id 0 at y=10).
    expect(grouped!.focusId).toBe(2);
    expect([...grouped!.memberIds]).toContain(2);
  });

  it("resolves a large non-seed series with O(log M) orth probes", () => {
    // Seed series is a singleton; other series has M points at the same x
    // with increasing y. group(seed) must binary-search the large series —
    // a linear scan would call Math.abs ~2*(M-1) times on that series alone.
    const M = 2048;
    const points: (readonly [number, number])[] = [[0, 0]]; // seed series
    for (let i = 0; i < M; i++) points.push([0, i]); // other series
    const plotScene = sceneWithPoints(points);
    const store = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: 1,
        yValue: primitiveIndex,
        seriesId: primitiveIndex === 0 ? 0 : 1,
        seriesRank: primitiveIndex === 0 ? 0 : 1,
      }),
    });
    void store.x;
    const absSpy = spyOn(Math, "abs");
    try {
      const grouped = store.group(0, "x");
      expect(grouped).not.toBeNull();
      // Closest in the large series to seed y=0 is the first member (y=0).
      expect([...grouped!.memberIds]).toContain(1);
      expect(absSpy.mock.calls.length).toBeLessThan(80);
    } finally {
      absSpy.mockRestore();
    }
  });
});
