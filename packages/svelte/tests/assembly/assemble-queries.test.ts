import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import {
  assemblePortableSpec,
  isFacetedPlotIntent,
  mappedChannelField,
} from "../../src/lib/assembly/assemble.js";

describe("mappedChannelField", () => {
  it("prefers plot-level aes field when present on the portable spec", () => {
    // normalize/builder usually merge plot aes into layers; the plot-level
    // branch still wins when aes remains on the assembled object.
    const assembled = {
      aes: { x: { field: "a" }, y: { field: "b" } },
      layers: [
        {
          geom: "point" as const,
          aes: { x: { field: "c" }, y: { field: "b" } },
        },
      ],
    };
    expect(mappedChannelField(fromAny(assembled), "x")).toBe("a");
    expect(mappedChannelField(fromAny(assembled), "y")).toBe("b");
  });

  it("falls through to the first layer with a non-null channel field", () => {
    const assembled = assemblePortableSpec({
      data: [{ a: 1, b: 2 }],
      layers: [
        { geom: "point", aes: { x: null } },
        { geom: "point", aes: { x: "a", y: "b" } },
      ],
    })!;
    expect(mappedChannelField(assembled, "x")).toBe("a");
  });

  it("returns the channel name when mapping is a constant value or absent", () => {
    const assembled = assemblePortableSpec({
      data: [{ x: 1, y: 2 }],
      layers: [{ geom: "point", aes: { x: { value: 1 }, y: "y" } }],
    })!;
    expect(mappedChannelField(assembled, "x")).toBe("x");
    expect(mappedChannelField(assembled, "y")).toBe("y");
  });

  it("returns the channel name when assembled is null", () => {
    expect(mappedChannelField(null, "x")).toBe("x");
    expect(mappedChannelField(null, "y")).toBe("y");
  });
});

describe("isFacetedPlotIntent", () => {
  it("is true from assembled.facet when the plot is driven by a portable spec", () => {
    // Spec-based plots put facet on the normalized spec, not a separate prop.
    const assembled = assemblePortableSpec({
      spec: {
        data: [{ x: 1, y: 2, g: "a" }],
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
        facet: { rows: "g" },
      },
      layers: [],
    });
    expect(assembled?.facet).toBeDefined();
    expect(
      isFacetedPlotIntent({
        assembled,
      }),
    ).toBe(true);
  });

  it("is false when neither a facet layer nor the assembled spec is faceted", () => {
    const assembled = assemblePortableSpec({
      data: [{ x: 1, y: 2 }],
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
    });
    expect(
      isFacetedPlotIntent({
        assembled,
      }),
    ).toBe(false);
    expect(isFacetedPlotIntent({ assembled: null })).toBe(false);
  });

  it("is true from a kind:facet plot layer with no facet prop and no assembled facet", () => {
    expect(
      isFacetedPlotIntent({
        plotLayers: [
          {
            kind: "facet",
            get value() {
              return { wrap: "g" };
            },
          },
        ],
        assembled: null,
      }),
    ).toBe(true);
  });
});
