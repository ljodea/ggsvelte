import { describe, expect, test } from "bun:test";

import {
  isLegendValueVisible,
  nextLegendFilterValues,
  reconcileLegendFilterValues,
} from "../src/lib/legend-filter.ts";

const catalog = ["west", "east", "north"] as const;

describe("legend filter state", () => {
  test("exclude mode toggles visibility without confusing typed values", () => {
    let values = nextLegendFilterValues([], "west", catalog, "exclude", true);
    expect(values).toEqual(["west"]);
    expect(isLegendValueVisible(values, "west", "exclude")).toBe(false);
    expect(isLegendValueVisible(values, "east", "exclude")).toBe(true);

    values = nextLegendFilterValues(values, "west", catalog, "exclude", true);
    expect(values).toEqual([]);

    expect(nextLegendFilterValues(["1"], 1, ["1", 1], "exclude", true)).toEqual(["1", 1]);
  });

  test("include mode starts from the full catalog and toggles shown values", () => {
    const values = nextLegendFilterValues(catalog, "east", catalog, "include", true);
    expect(values).toEqual(["west", "north"]);
    expect(isLegendValueVisible(values, "east", "include")).toBe(false);
    expect(isLegendValueVisible(values, "west", "include")).toBe(true);
  });

  test("single mode makes one category the sole visible category", () => {
    expect(nextLegendFilterValues([], "east", catalog, "exclude", false)).toEqual([
      "west",
      "north",
    ]);
    expect(nextLegendFilterValues([], "east", catalog, "include", false)).toEqual(["east"]);
  });

  test("reconciliation drops values no longer present in the stable catalog", () => {
    expect(reconcileLegendFilterValues(["west", "gone"], catalog)).toEqual(["west"]);
  });
});
