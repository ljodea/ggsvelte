import { describe, expect, it } from "bun:test";
import { Value } from "typebox/value";

import * as api from "../src/index.js";
import { gg } from "../src/index.js";
import { SpecModule } from "../src/schema.js";

const rows = [
  { x: 1, y: 2, group: "North", score: 0.2 },
  { x: 2, y: 3, group: "South", score: 0.8 },
];

const portable = (guides: unknown, scales: Record<string, unknown> = {}) => ({
  edition: 2,
  data: { values: rows },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "group" } },
    },
  ],
  scales,
  guides,
});

describe("responsive guide authoring API", () => {
  it("accepts strict top-level and scale-local portable guide variants", () => {
    expect(
      Value.Check(
        SpecModule.Import("PlotSpec"),
        portable(
          {
            x: { type: "axis", title: "Time", showTicks: false, collision: "preserve" },
            color: {
              type: "legend",
              title: "Region",
              order: 2,
              position: "bottom",
              direction: "horizontal",
              keySize: 14,
              collision: "wrap",
              force: true,
              theme: { titleSize: 12, labelSize: 11, keyGap: 8, rowGap: 4 },
            },
            fill: { type: "none" },
          },
          { color: { type: "ordinal", guide: { type: "legend", position: "right" } } },
        ),
      ),
    ).toBe(true);
    expect(
      Value.Check(
        SpecModule.Import("PlotSpec"),
        portable({ color: { type: "legend", position: "floating" } }),
      ),
    ).toBe(false);
    expect(
      Value.Check(
        SpecModule.Import("PlotSpec"),
        portable({ color: { type: "legend", keySize: 0 } }),
      ),
    ).toBe(false);
  });

  it("keeps theme-owned guide roles bounded in runtime schema", () => {
    expect(
      Value.Check(SpecModule.Import("ThemeSpec"), {
        guideTitleSize: 14,
        legendKeySize: 12,
        legendKeyGap: 6,
        legendRowGap: 4,
        guideBlockGap: 16,
        colorbarThickness: 14,
        colorbarLengthMin: 200,
      }),
    ).toBe(true);
    expect(Value.Check(SpecModule.Import("ThemeSpec"), { colorbarLengthMin: 20 })).toBe(false);
  });

  it("exports binding-identical camelCase and ggplot2 aliases", () => {
    expect(typeof api.guideAxis).toBe("function");
    expect(api.guide_axis).toBe(api.guideAxis);
    expect(api.guide_legend).toBe(api.guideLegend);
    expect(api.guide_colorbar).toBe(api.guideColorbar);
    expect(api.guide_colorsteps).toBe(api.guideColorsteps);
    expect(api.guide_none).toBe(api.guideNone);
  });

  it("emits canonical guide fragments and builder-equivalent JSON", () => {
    expect(api.guideAxis({ showLabels: false })).toEqual({
      type: "axis",
      showLabels: false,
    });
    expect(api.guideLegend({ position: "bottom", direction: "horizontal" })).toEqual({
      type: "legend",
      position: "bottom",
      direction: "horizontal",
    });
    expect(api.guides({ color: api.guideNone() })).toEqual({
      guides: { color: { type: "none" } },
    });

    const viaBuilder = gg(rows)
      .geomPoint({ aes: { x: "x", y: "y", color: "group" } })
      .guides({ color: api.guideLegend({ title: "Region", position: "bottom" }) })
      .spec();
    expect(viaBuilder.guides).toEqual({
      color: { type: "legend", title: "Region", position: "bottom" },
    });
    const first = api.normalize({
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
      guides: { shape: api.guideLegend(), x: api.guideAxis() },
    });
    const second = api.normalize({
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
      guides: { x: api.guideAxis(), shape: api.guideLegend() },
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("rejects guide variants incompatible with their aesthetic", () => {
    const colorAxis = api.validate(portable({ color: { type: "axis" } }));
    expect(colorAxis.ok).toBe(false);
    if (!colorAxis.ok)
      expect(colorAxis.errors.some((error) => error.code === "guide-aesthetic-incompatible")).toBe(
        true,
      );

    const xLegend = api.validate(portable({ x: { type: "legend" } }));
    expect(xLegend.ok).toBe(false);
    if (!xLegend.ok)
      expect(xLegend.errors.some((error) => error.code === "guide-aesthetic-incompatible")).toBe(
        true,
      );
  });
});
