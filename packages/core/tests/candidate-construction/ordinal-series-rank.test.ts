/**
 * Ordinal series rank assignment for candidate series ordering.
 */
import { describe, expect, it, spyOn } from "bun:test";

import { ordinalSeriesRank } from "../../src/pipeline/candidate-construction/datum-values.ts";
import { trainColor } from "../../src/scales/train.ts";

describe("ordinalSeriesRank", () => {
  it("falls back to group when no ordinal color/fill mapping applies", () => {
    expect(
      ordinalSeriesRank({
        color: null,
        fill: null,
        colorField: undefined,
        fillField: undefined,
        sourceRow: 0,
        sourceValue: () => "a",
        group: 3,
      }),
    ).toBe(3);
  });

  it("does not read source cells when color/fill are non-ordinal", () => {
    // Sequential/null scales must not force table.column / sourceValue lookups
    // for seriesRank (eager arg evaluation would regress continuous color paths).
    let reads = 0;
    const sequential = {
      kind: "sequential" as const,
      scale: { domain: [0, 1] as [number, number], colorOf: () => "#000" },
    };
    expect(
      ordinalSeriesRank({
        color: sequential,
        fill: sequential,
        colorField: "c",
        fillField: "f",
        sourceRow: 0,
        sourceValue: () => {
          reads += 1;
          return "x";
        },
        group: 4,
      }),
    ).toBe(4);
    expect(reads).toBe(0);
  });

  it("returns encodeKey assignment ranks from the ordinal color scale", () => {
    // 1 vs "1" must not collapse under presentation bandKey.
    const scale = trainColor([1, "1", "b"]);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale },
        fill: null,
        colorField: "c",
        fillField: undefined,
        sourceRow: 0,
        sourceValue: (field) => (field === "c" ? "1" : null),
        group: 99,
      }),
    ).toBe(1);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale },
        fill: null,
        colorField: "c",
        fillField: undefined,
        sourceRow: 0,
        sourceValue: (field) => (field === "c" ? 1 : null),
        group: 99,
      }),
    ).toBe(0);
  });

  it("prefers color rank over fill; falls back to fill then group", () => {
    const color = trainColor(["red-series"]);
    const fill = trainColor(["a", "b", "c"]);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale: color },
        fill: { kind: "ordinal", scale: fill },
        colorField: "color",
        fillField: "fill",
        sourceRow: 0,
        sourceValue: (field) => (field === "color" ? "red-series" : "c"),
        group: 5,
      }),
    ).toBe(0);
    expect(
      ordinalSeriesRank({
        color: null,
        fill: { kind: "ordinal", scale: fill },
        colorField: undefined,
        fillField: "fill",
        sourceRow: 0,
        sourceValue: (field) => (field === "fill" ? "c" : null),
        group: 5,
      }),
    ).toBe(2);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale: color },
        fill: { kind: "ordinal", scale: fill },
        colorField: "color",
        fillField: "fill",
        sourceRow: 0,
        sourceValue: () => "unknown",
        group: 5,
      }),
    ).toBe(5);
  });

  it("does not linear-scan the ordinal domain per candidate", () => {
    const domain = Array.from({ length: 50 }, (_, i) => `s${i}`);
    const scale = trainColor(domain);
    const findIndexSpy = spyOn(Array.prototype, "findIndex").mockImplementation(function (
      this: unknown[],
      ...args: Parameters<Array<unknown>["findIndex"]>
    ) {
      // Only fail if the scan targets the scale domain (the O(n·d) path).
      if (this === scale.domain || this === domain) {
        throw new Error(`ordinalSeriesRank used domain.findIndex(${String(args[0])})`);
      }
      return Array.prototype.findIndex.apply(this, args as never);
    });
    try {
      for (let i = 0; i < domain.length; i++) {
        const value = domain[i]!;
        expect(
          ordinalSeriesRank({
            color: { kind: "ordinal", scale },
            fill: null,
            colorField: "c",
            fillField: undefined,
            sourceRow: i,
            sourceValue: () => value,
            group: 0,
          }),
        ).toBe(i);
      }
    } finally {
      findIndexSpy.mockRestore();
    }
  });
});
