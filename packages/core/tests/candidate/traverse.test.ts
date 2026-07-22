import { describe, expect, it, spyOn } from "bun:test";

import { buildCandidateStore } from "../../src/candidate-store.ts";
import { sceneWithPoints } from "./fixtures.ts";

describe("candidate traversal hot path", () => {
  it("uses O(1) rank lookup for next/previous without scanning traversal", () => {
    const plotScene = sceneWithPoints([
      [10, 10],
      [20, 20],
      [30, 30],
      [40, 40],
    ]);
    const hot = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: primitiveIndex,
      }),
    });
    // Force the lazy construction boundary before policing resolution.
    void hot.x;
    const indexOfSpy = spyOn(Uint32Array.prototype, "indexOf").mockImplementation(function (
      this: Uint32Array,
      ...args: Parameters<Uint32Array["indexOf"]>
    ) {
      throw new Error(`traverse used linear indexOf(${String(args[0])})`);
    });
    try {
      expect(hot.traverse(0, "next")).toBe(1);
      expect(hot.traverse(1, "previous")).toBe(0);
      expect(hot.traverse(3, "next")).toBe(0);
      expect(hot.traverse(0, "previous")).toBe(3);
      expect(hot.traverse(null)).toBe(0);
      expect(hot.traverse(0, "first")).toBe(0);
      expect(hot.traverse(0, "last")).toBe(3);
      // Spatial still allowed to scan candidates by id; only sequential rank is constrained.
      expect(hot.traverse(0, "down")).toBe(1);
    } finally {
      indexOfSpy.mockRestore();
    }
  });

  it("directional traverse picks nearest primary run without scanning all candidates", () => {
    // Horizontal line of 2048 points; seed in the middle. Linear scan would
    // touch every id; binary search only inspects O(log n + k) for k=1.
    const n = 2048;
    const points: (readonly [number, number])[] = [];
    for (let i = 0; i < n; i++) points.push([i, 0]);
    const hot = buildCandidateStore(sceneWithPoints(points), {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: 0,
      }),
    });
    void hot.x;
    const seed = 1000;
    expect(hot.traverse(seed, "right")).toBe(seed + 1);
    expect(hot.traverse(seed, "left")).toBe(seed - 1);
    expect(hot.traverse(0, "left")).toBe(0); // nothing further left
    expect(hot.traverse(n - 1, "right")).toBe(n - 1);
  });

  it("directional traverse prefers topmost paint order when primary and orth both tie", () => {
    // Three points at x=20 with y=0,10,0; seed at (0,0). Right nearest primary
    // is x=20; among y=0 ties (orth 0), the later-painted higher id wins.
    const hot = buildCandidateStore(
      sceneWithPoints([
        [0, 0],
        [20, 0],
        [20, 10],
        [20, 0],
      ]),
      {
        datum: ({ primitiveIndex }) => ({
          xValue: primitiveIndex,
          yValue: primitiveIndex,
        }),
      },
    );
    void hot.x;
    expect(hot.traverse(0, "right")).toBe(3);
  });
});
