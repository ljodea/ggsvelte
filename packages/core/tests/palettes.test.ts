import { describe, expect, it } from "bun:test";

import { aes, gg, SpecValidationError } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
import { renderToSVGString } from "../src/render-svg.ts";
import {
  COLORBLIND_PALETTE,
  FLEXOKI_PALETTE,
  IPSUM_PALETTE,
  TABLEAU10_PALETTE,
} from "../src/scales/train.ts";

const PALETTES = {
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
} as const;

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
      { type: "ordinal" as const, scheme: "viridis" as const },
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
});
