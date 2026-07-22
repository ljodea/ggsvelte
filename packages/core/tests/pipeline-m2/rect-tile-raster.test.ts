/**
 * geom rect / tile / raster — geometry, scales, diagnostics (#586).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { PipelineError, runPipeline } from "../../src/pipeline.ts";
import { renderToSVGString } from "../../src/render-svg.ts";
import type { RectsBatch } from "../../src/scene.ts";
import { size } from "./fixtures.ts";

describe("geom rect", () => {
  it("emits one rect per row from xmin/xmax/ymin/ymax and trains domain on edges", () => {
    const model = runPipeline(
      gg(
        { xmin: [0, 2], xmax: [1, 4], ymin: [0, 1], ymax: [2, 3] },
        aes({ xmin: "xmin", xmax: "xmax", ymin: "ymin", ymax: "ymax" }),
      )
        .geomRect()
        .scales({ x: { nice: false }, y: { nice: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(2);
    expect(batch.anchor).toBe("center");
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain[0]).toBeLessThanOrEqual(0);
      expect(model.scales.x.domain[1]).toBeGreaterThanOrEqual(4);
    }
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[0]).toBeLessThanOrEqual(0);
      expect(model.scales.y.domain[1]).toBeGreaterThanOrEqual(3);
    }
    // No y-zero force for rect.
    expect(model.advisories.some((a) => a.code === "zero-forced")).toBe(false);
  });

  it("maps color to per-rect strokes", () => {
    const model = runPipeline(
      gg(
        {
          xmin: [0, 1],
          xmax: [0.5, 1.5],
          ymin: [0, 0],
          ymax: [1, 1],
          g: ["a", "b"],
        },
        aes({
          xmin: "xmin",
          xmax: "xmax",
          ymin: "ymin",
          ymax: "ymax",
          color: "g",
        }),
      )
        .geomRect({ linewidth: 2 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.strokes).toHaveLength(2);
    expect(new Set(batch.strokes).size).toBe(2);
    expect(batch.strokeWidth).toBe(2);
  });

  it("coord flip emits finite flipped rect geometry", () => {
    const model = runPipeline(
      gg(
        { xmin: [0], xmax: [2], ymin: [0], ymax: [1] },
        aes({ xmin: "xmin", xmax: "xmax", ymin: "ymin", ymax: "ymax" }),
      )
        .geomRect()
        .coordFlip()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.rects.length / 4).toBe(1);
    for (let i = 0; i < 4; i++) expect(Number.isFinite(batch.rects[i]!)).toBe(true);
    expect(batch.rects[2]!).toBeGreaterThan(0);
    expect(batch.rects[3]!).toBeGreaterThan(0);
  });
});

describe("geom tile", () => {
  it("continuous centers + default resolution produce abutting cells", () => {
    const model = runPipeline(
      gg({ x: [0, 1, 2], y: [0, 0, 0], z: [1, 2, 3] }, aes({ x: "x", y: "y", fill: "z" }))
        .geomTile()
        .scales({ x: { nice: false }, y: { nice: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(3);
    expect(batch.fills).toHaveLength(3);
    // Adjacent tiles share an edge (default width = resolution = 1).
    const right0 = batch.rects[0]! + batch.rects[2]!;
    expect(right0).toBeCloseTo(batch.rects[4]!, 3);
  });

  it("categorical heatmap trains band scales and draws one cell per category pair", () => {
    const model = runPipeline(
      gg(
        {
          x: ["a", "a", "b", "b"],
          y: ["low", "high", "low", "high"],
          z: [1, 2, 3, 4],
        },
        aes({ x: "x", y: "y", fill: "z" }),
      )
        .geomTile()
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("band");
    expect(model.scales.y.type).toBe("band");
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.rects.length / 4).toBe(4);
  });

  it("applies width after log transform (params.width is transformed-space span)", () => {
    const model = runPipeline(
      gg({ x: [1, 10, 100], y: [1, 1, 1] }, aes({ x: "x", y: "y" }))
        .geomTile({ width: 0.5, height: 0.5 })
        .scales({ x: { type: "linear", transform: "log10", nice: false }, y: { nice: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.rects.length / 4).toBe(3);
    // Equal width in transformed space → equal pixel widths under a linear panel map.
    const w0 = batch.rects[2]!;
    const w1 = batch.rects[6]!;
    expect(w0).toBeCloseTo(w1, 3);
  });

  it("rejects non-positive mapped width", () => {
    expect(() =>
      runPipeline(
        gg({ x: [1], y: [1], w: [0] }, aes({ x: "x", y: "y", width: "w" }))
          .geomTile()
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
  });
});

describe("geom raster", () => {
  it("draws equal cells on a regular grid without stroke", () => {
    const spec = gg(
      {
        x: [0, 1, 0, 1],
        y: [0, 0, 1, 1],
        z: [1, 2, 3, 4],
      },
      aes({ x: "x", y: "y", fill: "z" }),
    )
      .geomRaster()
      .scales({ x: { nice: false }, y: { nice: false } })
      .spec();
    const model = runPipeline(spec, size);
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.kind).toBe("rects");
    expect(batch.rects.length / 4).toBe(4);
    expect(batch.stroke).toBeUndefined();
    expect(batch.strokes).toBeUndefined();
    const svg = renderToSVGString(spec, size);
    expect(svg.match(/<rect /g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("errors on duplicate (x,y) cells", () => {
    expect(() =>
      runPipeline(
        gg({ x: [0, 0], y: [0, 0], z: [1, 2] }, aes({ x: "x", y: "y", fill: "z" }))
          .geomRaster()
          .spec(),
        size,
      ),
    ).toThrow(/raster-duplicate|duplicate/i);
  });

  it("warns on irregular spacing and still draws", () => {
    const model = runPipeline(
      gg({ x: [0, 1, 3], y: [0, 0, 0], z: [1, 2, 3] }, aes({ x: "x", y: "y", fill: "z" }))
        .geomRaster()
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "raster-irregular-spacing")).toBe(true);
    const batch = model.scene.batches[0] as RectsBatch;
    expect(batch.rects.length / 4).toBe(3);
  });
});
