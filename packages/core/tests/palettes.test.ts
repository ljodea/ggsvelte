import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
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
