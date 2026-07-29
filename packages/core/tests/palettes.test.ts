import { describe, expect, it } from "bun:test";

import { aes, gg, SpecValidationError, type PortableSpec } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
import { renderToSVGString } from "../src/render-svg.ts";
import {
  CATEGORICAL_PALETTE_10,
  CATEGORICAL_SCHEMES,
  COLORBLIND_PALETTE,
  ECONOMIST_PALETTE,
  FLEXOKI_PALETTE,
  IPSUM_PALETTE,
  TABLEAU_COLORBLIND_PALETTE,
  TABLEAU_GREEN_ORANGE_TEAL_PALETTE,
  TABLEAU_HUE_CIRCLE_PALETTE,
  TABLEAU_JEWEL_BRIGHT_PALETTE,
  TABLEAU_MILLER_STONE_PALETTE,
  TABLEAU_NURIEL_STONE_PALETTE,
  TABLEAU_PURPLE_PINK_GRAY_PALETTE,
  TABLEAU_RED_BLUE_BROWN_PALETTE,
  TABLEAU_SEATTLE_GRAYS_PALETTE,
  TABLEAU_SUMMER_PALETTE,
  TABLEAU_SUPERFISHEL_STONE_PALETTE,
  TABLEAU_TRAFFIC_PALETTE,
  TABLEAU_WINTER_PALETTE,
  TABLEAU10_PALETTE,
  TABLEAU20_PALETTE,
} from "../src/scales/train.ts";
import {
  CATEGORICAL_PALETTE_10 as PALETTE_DIRECT,
  CATEGORICAL_SCHEMES as SCHEMES_DIRECT,
  COLORBLIND_PALETTE as COLORBLIND_DIRECT,
  ECONOMIST_PALETTE as ECONOMIST_DIRECT,
  FLEXOKI_PALETTE as FLEXOKI_DIRECT,
  IPSUM_PALETTE as IPSUM_DIRECT,
  TABLEAU_COLORBLIND_PALETTE as TABLEAU_COLORBLIND_DIRECT,
  TABLEAU_GREEN_ORANGE_TEAL_PALETTE as TABLEAU_GREEN_ORANGE_TEAL_DIRECT,
  TABLEAU_HUE_CIRCLE_PALETTE as TABLEAU_HUE_CIRCLE_DIRECT,
  TABLEAU_JEWEL_BRIGHT_PALETTE as TABLEAU_JEWEL_BRIGHT_DIRECT,
  TABLEAU_MILLER_STONE_PALETTE as TABLEAU_MILLER_STONE_DIRECT,
  TABLEAU_NURIEL_STONE_PALETTE as TABLEAU_NURIEL_STONE_DIRECT,
  TABLEAU_PURPLE_PINK_GRAY_PALETTE as TABLEAU_PURPLE_PINK_GRAY_DIRECT,
  TABLEAU_RED_BLUE_BROWN_PALETTE as TABLEAU_RED_BLUE_BROWN_DIRECT,
  TABLEAU_SEATTLE_GRAYS_PALETTE as TABLEAU_SEATTLE_GRAYS_DIRECT,
  TABLEAU_SUMMER_PALETTE as TABLEAU_SUMMER_DIRECT,
  TABLEAU_SUPERFISHEL_STONE_PALETTE as TABLEAU_SUPERFISHEL_STONE_DIRECT,
  TABLEAU_TRAFFIC_PALETTE as TABLEAU_TRAFFIC_DIRECT,
  TABLEAU_WINTER_PALETTE as TABLEAU_WINTER_DIRECT,
  TABLEAU10_PALETTE as TABLEAU10_DIRECT,
  TABLEAU20_PALETTE as TABLEAU20_DIRECT,
} from "../src/scales/categorical-palettes.ts";

const PALETTES = {
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
  economist: ECONOMIST_PALETTE,
  tableau20: TABLEAU20_PALETTE,
  tableau_colorblind: TABLEAU_COLORBLIND_PALETTE,
  tableau_seattle_grays: TABLEAU_SEATTLE_GRAYS_PALETTE,
  tableau_traffic: TABLEAU_TRAFFIC_PALETTE,
  tableau_miller_stone: TABLEAU_MILLER_STONE_PALETTE,
  tableau_superfishel_stone: TABLEAU_SUPERFISHEL_STONE_PALETTE,
  tableau_nuriel_stone: TABLEAU_NURIEL_STONE_PALETTE,
  tableau_jewel_bright: TABLEAU_JEWEL_BRIGHT_PALETTE,
  tableau_summer: TABLEAU_SUMMER_PALETTE,
  tableau_winter: TABLEAU_WINTER_PALETTE,
  tableau_green_orange_teal: TABLEAU_GREEN_ORANGE_TEAL_PALETTE,
  tableau_red_blue_brown: TABLEAU_RED_BLUE_BROWN_PALETTE,
  tableau_purple_pink_gray: TABLEAU_PURPLE_PINK_GRAY_PALETTE,
  tableau_hue_circle: TABLEAU_HUE_CIRCLE_PALETTE,
} as const;

describe("train.ts palette re-export identity", () => {
  it("preserves the same module bindings as categorical-palettes", () => {
    expect(CATEGORICAL_PALETTE_10).toBe(PALETTE_DIRECT);
    expect(CATEGORICAL_SCHEMES).toBe(SCHEMES_DIRECT);
    expect(CATEGORICAL_SCHEMES.observable10).toBe(CATEGORICAL_PALETTE_10);
    expect(COLORBLIND_PALETTE).toBe(COLORBLIND_DIRECT);
    expect(ECONOMIST_PALETTE).toBe(ECONOMIST_DIRECT);
    expect(FLEXOKI_PALETTE).toBe(FLEXOKI_DIRECT);
    expect(IPSUM_PALETTE).toBe(IPSUM_DIRECT);
    expect(TABLEAU_COLORBLIND_PALETTE).toBe(TABLEAU_COLORBLIND_DIRECT);
    expect(TABLEAU_GREEN_ORANGE_TEAL_PALETTE).toBe(TABLEAU_GREEN_ORANGE_TEAL_DIRECT);
    expect(TABLEAU_HUE_CIRCLE_PALETTE).toBe(TABLEAU_HUE_CIRCLE_DIRECT);
    expect(TABLEAU_JEWEL_BRIGHT_PALETTE).toBe(TABLEAU_JEWEL_BRIGHT_DIRECT);
    expect(TABLEAU_MILLER_STONE_PALETTE).toBe(TABLEAU_MILLER_STONE_DIRECT);
    expect(TABLEAU_NURIEL_STONE_PALETTE).toBe(TABLEAU_NURIEL_STONE_DIRECT);
    expect(TABLEAU_PURPLE_PINK_GRAY_PALETTE).toBe(TABLEAU_PURPLE_PINK_GRAY_DIRECT);
    expect(TABLEAU_RED_BLUE_BROWN_PALETTE).toBe(TABLEAU_RED_BLUE_BROWN_DIRECT);
    expect(TABLEAU_SEATTLE_GRAYS_PALETTE).toBe(TABLEAU_SEATTLE_GRAYS_DIRECT);
    expect(TABLEAU_SUMMER_PALETTE).toBe(TABLEAU_SUMMER_DIRECT);
    expect(TABLEAU_SUPERFISHEL_STONE_PALETTE).toBe(TABLEAU_SUPERFISHEL_STONE_DIRECT);
    expect(TABLEAU_TRAFFIC_PALETTE).toBe(TABLEAU_TRAFFIC_DIRECT);
    expect(TABLEAU_WINTER_PALETTE).toBe(TABLEAU_WINTER_DIRECT);
    expect(TABLEAU10_PALETTE).toBe(TABLEAU10_DIRECT);
    expect(TABLEAU20_PALETTE).toBe(TABLEAU20_DIRECT);
  });
});

describe("named categorical palettes through the pipeline", () => {
  for (const [scheme, palette] of Object.entries(PALETTES)) {
    it(`renders ${scheme} in audited source order`, () => {
      const rows = palette.map((_, i) => ({ x: i, y: i, category: `c${i}` }));
      const spec = gg(rows, aes({ x: "x", y: "y", color: "category" }))
        .geomPoint()
        .scales({ color: { type: "ordinal", scheme } })
        .spec();
      const model = runPipeline(spec, { width: 640, height: 400 });
      const scale = model.scales.color;
      if (scale?.kind !== "ordinal") throw new Error("expected an ordinal color scale");
      expect(rows.map((row) => scale.scale.colorOf(row.category))).toEqual(palette);
    });
  }

  it("uses a named scheme to select its scale family when type is omitted", () => {
    const categorical = runPipeline(
      gg(
        [
          { x: 1, y: 1, category: 1 },
          { x: 2, y: 2, category: 2 },
        ],
        aes({ x: "x", y: "y", color: "category" }),
      )
        .geomPoint()
        .scales({ color: { scheme: "ipsum" } })
        .spec(),
      { width: 640, height: 400 },
    );
    const sequential = runPipeline(
      gg([{ x: 1, y: 1, category: "a" }], aes({ x: "x", y: "y", color: "category" }))
        .geomPoint()
        .scales({ color: { scheme: "viridis" } })
        .spec(),
      { width: 640, height: 400 },
    );

    expect(categorical.scales.color?.kind).toBe("ordinal");
    expect(sequential.scales.color?.kind).toBe("sequential");
  });

  it("rejects incompatible schemes at the render boundary", () => {
    for (const color of [
      { type: "sequential" as const, scheme: "ipsum" as const },
      { type: "binned" as const, scheme: "ipsum" as const },
    ]) {
      try {
        runPipeline(
          gg([{ x: 1, y: 1, category: "a" }], aes({ x: "x", y: "y", color: "category" }))
            .geomPoint()
            .scales({ color })
            .spec(),
          { width: 640, height: 400 },
        );
        expect.unreachable("expected an incompatible scheme to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(SpecValidationError);
        expect((error as SpecValidationError).errors.map((item) => item.code)).toContain(
          "scale-scheme-type",
        );
      }
    }
  });

  it("allows ordinal + sequential-family scheme at the render boundary (#828)", () => {
    const result = runPipeline(
      gg([{ x: 1, y: 1, category: "a" }], aes({ x: "x", y: "y", color: "category" }))
        .geomPoint()
        .scales({ color: { type: "ordinal", scheme: "viridis" } })
        .spec(),
      { width: 640, height: 400 },
    );
    expect(result.scales.color?.kind).toBe("ordinal");
  });

  it("reports malformed non-array ranges through spec validation", () => {
    const malformed = {
      data: { values: [{ x: 1, y: 1, category: "a" }] },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "category" } },
      layers: [{ geom: "point" }],
      scales: { color: { range: "#f00" } },
    } as unknown as PortableSpec;

    try {
      runPipeline(malformed, { width: 640, height: 400 });
      expect.unreachable("expected an invalid range to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(SpecValidationError);
      expect((error as SpecValidationError).errors.map((item) => item.code)).toContain(
        "invalid-type",
      );
    }
  });

  it("renders canonical colors for three-digit sequential stops", () => {
    const svg = renderToSVGString(
      gg(
        [
          { x: 1, y: 1, value: 0 },
          { x: 2, y: 2, value: 1 },
        ],
        aes({ x: "x", y: "y", color: "value" }),
      )
        .geomPoint()
        .scales({ color: { type: "sequential", range: ["#f00", "#00f"] } }),
      { width: 640, height: 400 },
    );

    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#0000ff"');
    expect(svg).not.toContain("NaN");
  });

  it("lets an explicit range take precedence over a named scheme", () => {
    const spec = gg(
      [{ x: 1, y: 1, category: "a" }],
      aes({
        x: "x",
        y: "y",
        color: "category",
      }),
    )
      .geomPoint()
      .scales({ color: { type: "ordinal", scheme: "ipsum", range: ["#123456"] } })
      .spec();
    const model = runPipeline(spec, { width: 640, height: 400 });
    const scale = model.scales.color;
    if (scale?.kind !== "ordinal") throw new Error("expected an ordinal color scale");
    expect(scale.scale.colorOf("a")).toBe("#123456");
  });

  it("lets an explicit range take precedence for omitted-type inference", () => {
    const spec = gg([{ x: 1, y: 1, category: "a" }], aes({ x: "x", y: "y", color: "category" }))
      .geomPoint()
      .scales({ color: { scheme: "viridis", range: ["#123456"] } })
      .spec();
    const model = runPipeline(spec, { width: 640, height: 400 });
    const scale = model.scales.color;

    if (scale?.kind !== "ordinal") throw new Error("expected an ordinal color scale");
    expect(scale.scale.colorOf("a")).toBe("#123456");
  });
});
