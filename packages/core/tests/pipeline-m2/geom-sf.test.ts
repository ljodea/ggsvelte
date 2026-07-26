/**
 * M2 pipeline — geom_sf portable GeoJSON geometries (#809 phase 1).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { PipelineError, runPipeline } from "../../src/pipeline.ts";
import type { PathsBatch, PointsBatch } from "../../src/scene.ts";

const size = { width: 400, height: 300 };

function geo(g: object): string {
  return JSON.stringify(g);
}

const polyA = geo({
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [0.5, 1],
      [0, 0],
    ],
  ],
});
const polyB = geo({
  type: "Polygon",
  coordinates: [
    [
      [2, 0],
      [3, 0],
      [2.5, 1],
      [2, 0],
    ],
  ],
});

describe("geom_sf", () => {
  it("renders closed filled polygons from GeoJSON Geometry strings", () => {
    const model = runPipeline(
      gg({ geometry: [polyA, polyB], rate: [10, 20] }, aes({ fill: "rate" }))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    expect(batch.closed).toBe(true);
    expect(batch.pathOffsets.length - 1).toBe(2);
    expect(batch.fills?.length).toBe(2);
    expect(batch.fills![0]).not.toBe(batch.fills![1]);
  });

  it("renders MultiPolygon as multiple closed rings", () => {
    const multi = geo({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [0.5, 1],
            [0, 0],
          ],
        ],
        [
          [
            [3, 0],
            [4, 0],
            [3.5, 1],
            [3, 0],
          ],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [multi], id: ["islands"] }, aes({ fill: "id" }))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(2);
  });

  it("renders LineString as open path in data order", () => {
    const line = geo({
      type: "LineString",
      coordinates: [
        [3, 30],
        [1, 10],
        [2, 20],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [line] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    expect(batch.closed).toBeFalsy();
    // Data order preserved (first vertex is x=3 → largest pixel x under linear).
    expect(batch.positions[0]!).toBeGreaterThan(batch.positions[2]!);
  });

  it("renders Point geometries as a points batch", () => {
    const model = runPipeline(
      gg(
        {
          geometry: [
            geo({ type: "Point", coordinates: [1, 2] }),
            geo({ type: "Point", coordinates: [3, 4] }),
          ],
          g: ["a", "b"],
        },
        aes({ color: "g" }),
      )
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PointsBatch;
    expect(batch.kind).toBe("points");
    expect(batch.positions.length / 2).toBe(2);
  });

  it("draws interior rings as even-odd holes (no ignore warning)", () => {
    // Exterior triangle (0,0)-(4,0)-(2,4); hole triangle (1,1)-(2,1)-(1.5,2).
    const withHole = geo({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [2, 4],
          [0, 0],
        ],
        [
          [1, 1],
          [2, 1],
          [1.5, 2],
          [1, 1],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [withHole] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "sf-holes-ignored")).toBe(false);
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(1);
    // Exterior 3 verts + hole 3 verts (closing duplicates dropped).
    expect(batch.positions.length / 2).toBe(6);
    expect(batch.fillRule).toBe("evenodd");
    expect(batch.ringStarts).toBeDefined();
    expect([...batch.ringStarts!]).toEqual([3]);
  });

  it("hit-tests exterior minus holes (even-odd)", () => {
    const withHole = geo({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [withHole] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    // Map data → panel px via scales (linear trained on [0,10] × [0,10]).
    const panel = model.scene.panels[0]!;
    const toPlot = (dx: number, dy: number) => {
      const sx = model.scales.x;
      const sy = model.scales.y;
      if (sx.type === "band" || sy.type === "band") throw new Error("expected continuous");
      const nx = sx.normalizeTransformed(dx);
      const ny = sy.normalizeTransformed(dy);
      if (nx === undefined || ny === undefined) throw new Error("normalize failed");
      const px = panel.x + nx * panel.width;
      const py = panel.y + (1 - ny) * panel.height;
      return { px, py };
    };
    const exterior = toPlot(1, 1);
    const hole = toPlot(5, 5);
    expect(model.candidates.hitTest(exterior.px, exterior.py)).not.toBeNull();
    expect(model.candidates.hitTest(hole.px, hole.py)).toBeNull();
  });

  it("keeps MultiPolygon parts as separate compounds when one has a hole", () => {
    const multi = geo({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [2, 0],
            [1, 2],
            [0, 0],
          ],
          [
            [0.5, 0.4],
            [1.5, 0.4],
            [1, 1.2],
            [0.5, 0.4],
          ],
        ],
        [
          [
            [4, 0],
            [6, 0],
            [5, 2],
            [4, 0],
          ],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [multi] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    // Two polygon parts → two path subpaths.
    expect(batch.pathOffsets.length - 1).toBe(2);
    expect(batch.fillRule).toBe("evenodd");
    // First part: 3 exterior + 3 hole; second part: 3 exterior.
    expect(batch.positions.length / 2).toBe(9);
  });

  it("uses exact auto hit mode", () => {
    const model = runPipeline(
      gg({ geometry: [polyA] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    expect(model.candidates.candidate(0)?.autoMode).toBe("exact");
  });

  it("trains domains from geometry coordinates without aes.x/y", () => {
    const model = runPipeline(
      gg(
        {
          geometry: [
            geo({
              type: "Polygon",
              coordinates: [
                [
                  [2, 5],
                  [4, 5],
                  [3, 8],
                  [2, 5],
                ],
              ],
            }),
          ],
        },
        aes({}),
      )
        .geomSf()
        .spec(),
      size,
    );
    if (model.scales.x.type !== "band") {
      expect(model.scales.x.domain[0]).toBeLessThanOrEqual(2);
      expect(model.scales.x.domain[1]).toBeGreaterThanOrEqual(4);
    }
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[0]).toBeGreaterThan(0);
      expect(model.scales.y.domain[0]).toBeLessThanOrEqual(5);
      expect(model.scales.y.domain[1]).toBeGreaterThanOrEqual(8);
    }
  });

  it("errors when geometry column is missing", () => {
    try {
      runPipeline(
        gg({ x: [1] }, aes({}))
          .geomSf()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).code).toBe("sf-geometry-missing");
    }
  });

  it("errors on mixed geometry families in one layer", () => {
    try {
      runPipeline(
        gg(
          {
            geometry: [polyA, geo({ type: "Point", coordinates: [0, 0] })],
          },
          aes({}),
        )
          .geomSf()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).code).toBe("sf-geometry-mixed");
    }
  });

  it("renders GeometryCollection of polygons as multiple closed parts", () => {
    const gc = geo({
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [0.5, 1],
              [0, 0],
            ],
          ],
        },
        {
          type: "Polygon",
          coordinates: [
            [
              [3, 0],
              [4, 0],
              [3.5, 1],
              [3, 0],
            ],
          ],
        },
      ],
    });
    const model = runPipeline(
      gg({ geometry: [gc], id: ["parts"] }, aes({ fill: "id" }))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(2);
  });

  it("errors when GeometryCollection mixes geometry families", () => {
    try {
      runPipeline(
        gg(
          {
            geometry: [
              geo({
                type: "GeometryCollection",
                geometries: [
                  { type: "Point", coordinates: [0, 0] },
                  {
                    type: "Polygon",
                    coordinates: [
                      [
                        [0, 0],
                        [1, 0],
                        [0.5, 1],
                        [0, 0],
                      ],
                    ],
                  },
                ],
              }),
            ],
          },
          aes({}),
        )
          .geomSf()
          .spec(),
        size,
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).code).toBe("sf-geometry-mixed");
    }
  });

  it("honors params.geometry column name", () => {
    const model = runPipeline(
      gg({ geom: [polyA], rate: [1] }, aes({ fill: "rate" }))
        .geomSf({ geometry: "geom" })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.closed).toBe(true);
    expect(batch.pathOffsets.length - 1).toBe(1);
  });
});
