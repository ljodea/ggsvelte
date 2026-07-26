/**
 * geom_hex + stat_bin_hex (#800).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "@ggsvelte/spec";

import { runPipeline } from "../../src/pipeline.ts";
import type { PathsBatch } from "../../src/scene.ts";

const size = { width: 200, height: 100 };

describe("geom_hex schema (#800)", () => {
  it("accepts hex with continuous x/y", () => {
    const result = validate(
      {
        data: { values: [{ x: 1, y: 2 }] },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [{ geom: "hex", params: { bins: 5 } }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("normalize defaults fill to after_stat count", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2 }] },
      aes: { x: { field: "x" }, y: { field: "y" } },
      layers: [{ geom: "hex" }],
    });
    expect(spec.layers[0]?.geom).toBe("hex");
    expect(spec.layers[0]?.stat).toBe("bin_hex");
    expect(spec.layers[0]?.aes?.fill).toEqual({ stat: "count" });
  });

  it("builder sugar emits hex + params", () => {
    const spec = gg({ x: [1, 2], y: [3, 4] }, aes({ x: "x", y: "y" }))
      .geomHex({ bins: 10, drop: true })
      .spec();
    expect(spec.layers[0]?.geom).toBe("hex");
    expect(spec.layers[0]?.params).toMatchObject({ bins: 10, drop: true });
  });
});

describe("geom_hex geometry (#800)", () => {
  it("emits closed hex paths with fill from count", () => {
    const model = runPipeline(
      gg(
        {
          x: [0.1, 0.2, 0.8, 0.9, 0.5],
          y: [0.1, 0.15, 0.8, 0.9, 0.5],
        },
        aes({ x: "x", y: "y" }),
      )
        .geomHex({ bins: 6 })
        .spec(),
      size,
    );
    const paths = model.scene.batches.filter((b) => b.kind === "paths") as PathsBatch[];
    expect(paths.length).toBe(1);
    const batch = paths[0]!;
    expect(batch.closed).toBe(true);
    expect(batch.fills).toBeDefined();
    const nHex = batch.pathOffsets.length - 1;
    expect(nHex).toBeGreaterThan(0);
    expect(batch.fills!.length).toBe(nHex);
    // 6 vertices per hex
    expect(batch.positions.length / 2).toBe(nHex * 6);
  });

  it("more bins can produce more occupied hexes", () => {
    const n = 50;
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      x.push(i / (n - 1));
      y.push(((i * 11) % n) / (n - 1));
    }
    const sparse = runPipeline(
      gg({ x, y }, aes({ x: "x", y: "y" }))
        .geomHex({ bins: 4 })
        .spec(),
      size,
    );
    const dense = runPipeline(
      gg({ x, y }, aes({ x: "x", y: "y" }))
        .geomHex({ bins: 12 })
        .spec(),
      size,
    );
    const sparseN =
      (sparse.scene.batches.find((b) => b.kind === "paths") as PathsBatch).pathOffsets.length - 1;
    const denseN =
      (dense.scene.batches.find((b) => b.kind === "paths") as PathsBatch).pathOffsets.length - 1;
    expect(denseN).toBeGreaterThanOrEqual(sparseN);
  });
});
