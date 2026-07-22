/**
 * Per-layer DataRef (#589): bind, inheritance, multi-table scales, facets,
 * source-row identity for model.row().
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { PipelineError, runPipeline } from "../src/pipeline.ts";

const size = { width: 640, height: 400 };

const obs = [
  { x: 1, y: 10, g: "a" },
  { x: 2, y: 20, g: "a" },
  { x: 3, y: 15, g: "b" },
  { x: 4, y: 25, g: "b" },
];

const bands = [
  { xmin: 0.5, xmax: 2.5, ymin: 0, ymax: 30, label: "early" },
  { xmin: 2.5, xmax: 4.5, ymin: 0, ymax: 30, label: "late" },
];

const annotations = [{ x: 2, y: 28, label: "peak" }];

function markCount(model: ReturnType<typeof runPipeline>, kind: string): number {
  return model.scene.batches
    .filter((b) => b.kind === kind)
    .reduce((n, b) => n + b.rowIndex.length, 0);
}

describe("layer data inheritance and no-data", () => {
  it("layer without data inherits plot data (marks still render)", () => {
    const model = runPipeline(
      gg(obs, aes({ x: "x", y: "y" }))
        .geomPoint()
        .spec(),
      size,
    );
    expect(markCount(model, "points")).toBe(obs.length);
  });

  it("plot may omit data when every layer supplies data", () => {
    const model = runPipeline(
      {
        layers: [
          {
            geom: "point",
            data: { values: obs },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
          {
            geom: "rect",
            data: { values: bands },
            aes: {
              xmin: { field: "xmin" },
              xmax: { field: "xmax" },
              ymin: { field: "ymin" },
              ymax: { field: "ymax" },
            },
          },
        ],
      },
      size,
    );
    expect(markCount(model, "points")).toBe(obs.length);
    expect(markCount(model, "rects")).toBe(bands.length);
  });

  it("throws no-data for a layer that has neither plot nor layer data", () => {
    try {
      runPipeline(
        {
          layers: [
            {
              geom: "point",
              data: { values: obs },
              aes: { x: { field: "x" }, y: { field: "y" } },
            },
            {
              geom: "point",
              aes: { x: { field: "x" }, y: { field: "y" } },
            },
          ],
        },
        size,
      );
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("no-data");
      expect((e as PipelineError).path).toBe("/layers/1");
    }
  });

  it("explicit empty layer columns does not inherit plot data", () => {
    const model = runPipeline(
      {
        data: { values: obs },
        aes: { x: { field: "x" }, y: { field: "y" } },
        layers: [
          { geom: "point" },
          {
            geom: "point",
            data: { columns: { x: [], y: [] } },
          },
        ],
      },
      size,
    );
    // Only the inherited layer contributes marks.
    expect(markCount(model, "points")).toBe(obs.length);
  });
});

describe("layer named datasets", () => {
  it("resolves layer name from spec.datasets", () => {
    const model = runPipeline(
      {
        datasets: { cars: { values: obs } },
        layers: [
          {
            geom: "point",
            data: { name: "cars" },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      size,
    );
    expect(markCount(model, "points")).toBe(obs.length);
  });

  it("resolves layer name from RunOptions.data", () => {
    const model = runPipeline(
      {
        layers: [
          {
            geom: "point",
            data: { name: "cars" },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      { ...size, data: { cars: obs } },
    );
    expect(markCount(model, "points")).toBe(obs.length);
  });

  it("throws dataset-collision at layer path without allowOverride", () => {
    try {
      runPipeline(
        {
          datasets: { cars: { values: obs } },
          layers: [
            {
              geom: "point",
              data: { name: "cars" },
              aes: { x: { field: "x" }, y: { field: "y" } },
            },
          ],
        },
        { ...size, data: { cars: obs } },
      );
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("dataset-collision");
      expect((e as PipelineError).path).toBe("/layers/0/data/name");
    }
  });
});

describe("multi-table scales and source identity", () => {
  it("shared x domain unions observation and band extents", () => {
    const model = runPipeline(
      {
        layers: [
          {
            geom: "point",
            data: {
              values: [
                { x: 1, y: 10 },
                { x: 2, y: 20 },
              ],
            },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
          {
            geom: "rect",
            data: { values: [{ xmin: 10, xmax: 12, ymin: 0, ymax: 5 }] },
            aes: {
              xmin: { field: "xmin" },
              xmax: { field: "xmax" },
              ymin: { field: "ymin" },
              ymax: { field: "ymax" },
            },
          },
        ],
      },
      size,
    );
    const xDomain = model.domains.effective.x;
    expect(xDomain[0]).toBeLessThanOrEqual(1);
    expect(xDomain[1]).toBeGreaterThanOrEqual(12);
  });

  it("model.row resolves candidates against the owning layer table", () => {
    const model = runPipeline(
      {
        layers: [
          {
            geom: "point",
            data: { values: [{ x: 1, y: 10, tag: "obs" }] },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
          {
            geom: "point",
            data: { values: [{ x: 5, y: 50, tag: "other" }] },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      size,
    );
    const tags = new Set<string>();
    for (const batch of model.scene.batches) {
      if (batch.kind !== "points") continue;
      for (let i = 0; i < batch.rowIndex.length; i++) {
        const idx = batch.rowIndex[i]!;
        if (idx === 0xffffffff) continue;
        const row = model.row(idx);
        if (row && typeof row.tag === "string") tags.add(row.tag);
      }
    }
    expect(tags.has("obs")).toBe(true);
    expect(tags.has("other")).toBe(true);
  });
});

describe("layer data facets", () => {
  it("annotation layer without facet field replicates across all panels", () => {
    const model = runPipeline(
      {
        data: { values: obs },
        aes: { x: { field: "x" }, y: { field: "y" } },
        facet: { wrap: { field: "g" } },
        layers: [
          { geom: "point" },
          {
            geom: "text",
            data: { values: annotations },
            aes: { x: { field: "x" }, y: { field: "y" }, label: { field: "label" } },
          },
        ],
      },
      size,
    );
    expect(model.scene.panels.length).toBe(2);
    // One annotation mark per panel.
    expect(markCount(model, "glyphs")).toBe(2);
    // Both glyph rows resolve to the same underlying annotation source row.
    const glyphRows = model.scene.batches
      .filter((b) => b.kind === "glyphs")
      .flatMap((b) => [...b.rowIndex]);
    expect(new Set(glyphRows).size).toBe(1);
    expect(model.row(glyphRows[0]!)?.label).toBe("peak");
  });

  it("layer with facet field partitions into matching panels only", () => {
    const model = runPipeline(
      {
        data: { values: obs },
        aes: { x: { field: "x" }, y: { field: "y" } },
        facet: { wrap: { field: "g" } },
        layers: [
          { geom: "point" },
          {
            geom: "point",
            data: {
              values: [
                { x: 1.5, y: 12, g: "a", tag: "only-a" },
                { x: 3.5, y: 22, g: "b", tag: "only-b" },
              ],
            },
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "tag" } },
          },
        ],
      },
      size,
    );
    expect(model.scene.panels.length).toBe(2);
    // Both secondary points should render (one per panel) plus observations.
    expect(markCount(model, "points")).toBe(obs.length + 2);
  });

  // #608: first-complete layout omitted panels that only appear on later layers.
  it("unions facet levels across complete per-layer tables (wrap)", () => {
    const model = runPipeline(
      {
        facet: { wrap: { field: "g" } },
        layers: [
          {
            geom: "point",
            data: {
              values: [
                { x: 1, y: 10, g: "a" },
                { x: 2, y: 20, g: "a" },
              ],
            },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
          {
            geom: "point",
            data: {
              values: [
                { x: 3, y: 30, g: "b" },
                { x: 4, y: 40, g: "b" },
              ],
            },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      size,
    );
    expect(model.scene.panels.map((p) => p.strip)).toEqual(["a", "b"]);
    expect(markCount(model, "points")).toBe(4);
  });

  it("unions facet levels when a layer introduces levels absent from plot data", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { x: 1, y: 10, g: "a" },
            { x: 2, y: 20, g: "b" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" } },
        facet: { wrap: { field: "g" } },
        layers: [
          { geom: "point" },
          {
            geom: "point",
            data: {
              values: [
                { x: 5, y: 50, g: "c", tag: "extra" },
                { x: 6, y: 60, g: "c", tag: "extra" },
              ],
            },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      size,
    );
    expect(model.scene.panels.map((p) => p.strip)).toEqual(["a", "b", "c"]);
    // Plot points (2) + layer-local "c" points (2).
    expect(markCount(model, "points")).toBe(4);
  });

  it("unions facet grid levels across complete per-layer tables", () => {
    const model = runPipeline(
      {
        facet: { rows: { field: "r" }, cols: { field: "c" } },
        layers: [
          {
            geom: "point",
            data: { values: [{ x: 1, y: 1, r: "R1", c: "C1" }] },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
          {
            geom: "point",
            data: { values: [{ x: 2, y: 2, r: "R2", c: "C2" }] },
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      size,
    );
    // Grid keeps the full rows × cols product (empty combos stay empty).
    expect(model.scene.panels).toHaveLength(4);
    expect(model.scene.panels.map((p) => p.strip).toSorted()).toEqual(
      ["R1 / C1", "R1 / C2", "R2 / C1", "R2 / C2"].toSorted(),
    );
    expect(markCount(model, "points")).toBe(2);
  });
});
