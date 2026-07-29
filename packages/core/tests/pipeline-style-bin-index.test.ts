/**
 * styleBinIndex — O(log B) membership matching the legacy findIndex contract.
 */
import { describe, expect, it } from "bun:test";

import { styleBinIndex } from "../src/pipeline/style-bin-index.ts";

/** Historical linear lookup used by binned style scales / group columns. */
function legacyStyleBinIndex(boundaries: readonly number[], value: number): number {
  let bin = boundaries.findIndex((upper, index) => index > 0 && value < upper) - 1;
  if (bin < 0) bin = boundaries.length - 2;
  return bin;
}

describe("styleBinIndex", () => {
  it("matches findIndex on a dense break grid including edges and midpoints", () => {
    const boundaries = Array.from({ length: 33 }, (_, i) => i * 0.5); // 0 … 16
    const samples: number[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      samples.push(boundaries[i]!);
      if (i + 1 < boundaries.length) {
        samples.push((boundaries[i]! + boundaries[i + 1]!) / 2);
      }
    }
    samples.push(boundaries[0]! - 1, boundaries.at(-1)! + 1);
    for (const value of samples) {
      expect(styleBinIndex(boundaries, value)).toBe(legacyStyleBinIndex(boundaries, value));
    }
  });

  it("places exact internal boundaries in the higher bin (left-closed intervals)", () => {
    const b = [0, 1, 2, 3];
    expect(styleBinIndex(b, 0)).toBe(0);
    expect(styleBinIndex(b, 1)).toBe(1);
    expect(styleBinIndex(b, 2)).toBe(2);
    expect(styleBinIndex(b, 3)).toBe(2); // closed upper of last bin
  });

  it("handles a two-edge single bin", () => {
    expect(styleBinIndex([0, 10], 0)).toBe(0);
    expect(styleBinIndex([0, 10], 5)).toBe(0);
    expect(styleBinIndex([0, 10], 10)).toBe(0);
  });
});
