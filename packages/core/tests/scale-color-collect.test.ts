/**
 * Color channel value collection for scale training.
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { ColumnTable } from "../src/table.ts";

describe("collectColorChannelValues", () => {
  it("returns empty when no color mapping is present", async () => {
    const { collectColorChannelValues } = await import("../src/pipeline/scale-color-collect.ts");
    const table = fromAny({ has: () => false, discreteness: () => "continuous" });
    const frames = fromAny([
      {
        binding: {
          color: { field: null, scaledConstant: null },
          fill: { field: null, scaledConstant: null },
        },
        colorValues: null,
        fillValues: null,
      },
    ]);
    expect(collectColorChannelValues("color", frames, table)).toEqual({
      values: [],
      anyDiscreteField: false,
      anyField: false,
    });
  });
});

describe("collectColorChannelFlags + countNullColorChannelValues", () => {
  it("flags mapping without materializing per-row values", async () => {
    const { collectColorChannelFlags, countNullColorChannelValues } =
      await import("../src/pipeline/scale-color-collect.ts");
    const table = ColumnTable.fromColumns({
      series: ["a", "b", null, "a"],
    });
    const frames = fromAny([
      {
        binding: {
          color: { field: "series", scaledConstant: null, statColumn: null },
          fill: { field: null, scaledConstant: null, statColumn: null },
        },
        colorValues: table.column("series"),
        fillValues: null,
      },
    ]);
    expect(collectColorChannelFlags("color", frames, table)).toEqual({
      anyDiscreteField: true,
      anyField: true,
    });
    expect(countNullColorChannelValues("color", frames)).toBe(1);
  });
});

describe("collectColorCatalogValues string monomorph path", () => {
  it("keeps first-seen order for series labels", async () => {
    const { collectColorCatalogValues } = await import("../src/pipeline/scale-color-collect.ts");
    const table = ColumnTable.fromColumns({
      series: ["s0", "s1", "s0", "s2", "s1"],
    });
    const bindings = fromAny([
      {
        color: { field: "series", scaledConstant: null },
        fill: { field: null, scaledConstant: null },
        sourceTable: table,
      },
    ]);
    const catalog = collectColorCatalogValues("color", bindings, table);
    expect(catalog.catalogValues).toEqual(["s0", "s1", "s2"]);
    expect(catalog.anyDiscreteField).toBe(true);
    expect(catalog.anyField).toBe(true);
  });
});
