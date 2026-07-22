/**
 * sortGroupRowsByX: one O(R) band indexOf pass, then O(1) comparator reads.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { trainBand, trainContinuous } from "../src/scales/train.ts";
import { sortGroupRowsByX } from "../src/pipeline/geometry-shared-bucket.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";

describe("sortGroupRowsByX", () => {
  it("orders band x by domain rank, not row arrival order", () => {
    const band = trainBand([["a", "b", "c"]]);
    // Shuffled arrival: c, a, b within one group.
    const frame = fromAny<LayerFrame>({
      n: 3,
      xValues: ["c", "a", "b"],
      xNumeric: null,
      groups: [0, 0, 0],
    });
    const fx = fromPartial<Frame>({ xScale: band });
    const groupRows = [[0, 1, 2]];
    sortGroupRowsByX(groupRows, frame, fx);
    expect(groupRows[0]).toEqual([1, 2, 0]); // a, b, c
  });

  it("orders continuous x by xNumeric without mutating the array", () => {
    const linear = trainContinuous([[0, 1, 2]], {});
    const xNumeric = Float64Array.of(30, 10, 20);
    const frame = fromAny<LayerFrame>({
      n: 3,
      xValues: null,
      xNumeric,
      groups: [0, 0, 0],
    });
    const fx = fromPartial<Frame>({ xScale: linear });
    const groupRows = [[0, 1, 2]];
    sortGroupRowsByX(groupRows, frame, fx);
    expect(groupRows[0]).toEqual([1, 2, 0]);
    expect([...xNumeric]).toEqual([30, 10, 20]);
  });

  it('distinguishes typed keys 1 vs "1" (encodeKey parity)', () => {
    const band = trainBand([[1, "1"]]);
    const frame = fromAny<LayerFrame>({
      n: 2,
      xValues: ["1", 1],
      xNumeric: null,
      groups: [0, 0],
    });
    const fx = fromPartial<Frame>({ xScale: band });
    const groupRows = [[0, 1]];
    sortGroupRowsByX(groupRows, frame, fx);
    // Domain order: number 1 then string "1"
    expect(groupRows[0]).toEqual([1, 0]);
  });

  it("calls band indexOf once per frame row (not per comparator)", () => {
    const band = trainBand([["a", "b", "c", "d", "e"]]);
    let indexOfCalls = 0;
    const instrumented = {
      ...band,
      indexOf(value: unknown): number | undefined {
        indexOfCalls++;
        return band.indexOf(value);
      },
    };
    const n = 40;
    const labels = ["e", "d", "c", "b", "a"] as const;
    const xValues = Array.from({ length: n }, (_, i) => labels[i % labels.length]!);
    const frame = fromAny<LayerFrame>({
      n,
      xValues,
      xNumeric: null,
      groups: Array.from({ length: n }, () => 0),
    });
    const fx = fromPartial<Frame>({ xScale: instrumented });
    const groupRows = [Array.from({ length: n }, (_, i) => i)];
    sortGroupRowsByX(groupRows, frame, fx);
    expect(indexOfCalls).toBe(n);
    // Sorted into domain order a…e repeating by original relative ties (unstable ok).
    const ranks = groupRows[0]!.map((row) => band.indexOf(xValues[row]!)!);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
    }
  });

  it("sorts each group independently", () => {
    const band = trainBand([["a", "b", "c"]]);
    const frame = fromAny<LayerFrame>({
      n: 4,
      xValues: ["c", "a", "b", "a"],
      xNumeric: null,
      groups: [0, 0, 1, 1],
    });
    const fx = fromPartial<Frame>({ xScale: band });
    const groupRows = [
      [0, 1], // c, a → a, c
      [2, 3], // b, a → a, b
    ];
    sortGroupRowsByX(groupRows, frame, fx);
    expect(groupRows[0]).toEqual([1, 0]);
    expect(groupRows[1]).toEqual([3, 2]);
  });
});
