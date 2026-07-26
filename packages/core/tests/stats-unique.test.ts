/**
 * Pure stat_unique first-wins contract (#813).
 */
import { describe, expect, it } from "bun:test";

import { statUnique } from "../src/stats/unique.ts";

describe("statUnique", () => {
  it("keeps first row per key in stable ascending order", () => {
    const result = statUnique({
      keys: [
        ["a", 1],
        ["a", 1],
        ["b", 2],
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ],
    });
    expect(result.keep).toEqual([0, 2, 5]);
  });

  it("treats null as a distinct key component", () => {
    const result = statUnique({
      keys: [
        ["a", null],
        ["a", 0],
        ["a", null],
      ],
    });
    expect(result.keep).toEqual([0, 1]);
  });

  it("collapses NaN keys together via Object.is", () => {
    const result = statUnique({
      keys: [[Number.NaN], [1], [Number.NaN]],
    });
    expect(result.keep).toEqual([0, 1]);
  });

  it("keeps all rows when every key is unique", () => {
    const result = statUnique({
      keys: [[0], [1], [2]],
    });
    expect(result.keep).toEqual([0, 1, 2]);
  });

  it("collapses all rows when keys are empty tuples", () => {
    const result = statUnique({
      keys: [[], [], []],
    });
    expect(result.keep).toEqual([0]);
  });
});
