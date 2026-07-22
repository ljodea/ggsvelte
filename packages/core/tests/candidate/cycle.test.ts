import { describe, expect, it, spyOn } from "bun:test";

import { buildCandidateStore } from "../../src/candidate-store.ts";
import { sceneWithPoints } from "./fixtures.ts";

describe("candidate cycle hot path", () => {
  it("uses prebuilt coincident stacks without scanning or indexOf on each step", () => {
    // Three-way stack at (10, 10) plus a singleton — build order is paint/source (id asc).
    const plotScene = sceneWithPoints([
      [10, 10],
      [20, 20],
      [10, 10],
      [10, 10],
    ]);
    const hot = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex,
        yValue: primitiveIndex,
      }),
    });
    // Force the lazy construction boundary before policing resolution.
    void hot.x;
    const arrayIndexOfSpy = spyOn(Array.prototype, "indexOf").mockImplementation(function (
      this: unknown[],
      ...args: Parameters<Array<unknown>["indexOf"]>
    ) {
      throw new Error(`cycle used Array.indexOf(${String(args[0])})`);
    });
    const typedIndexOfSpy = spyOn(Uint32Array.prototype, "indexOf").mockImplementation(function (
      this: Uint32Array,
      ...args: Parameters<Uint32Array["indexOf"]>
    ) {
      throw new Error(`cycle used Uint32Array.indexOf(${String(args[0])})`);
    });
    try {
      expect(hot.cycle(0, 1)).toBe(2);
      expect(hot.cycle(2, 1)).toBe(3);
      expect(hot.cycle(3, 1)).toBe(0);
      expect(hot.cycle(0, -1)).toBe(3);
      expect(hot.cycle(1, 5)).toBe(1);
      expect(hot.cycle(-1)).toBeNull();
      expect(hot.cycle(99)).toBeNull();
    } finally {
      arrayIndexOfSpy.mockRestore();
      typedIndexOfSpy.mockRestore();
    }
  });
});
