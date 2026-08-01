/**
 * M2 pipeline — geom_sf portable GeoJSON geometries (#809 phase 1).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { PipelineError, runPipeline } from "../../src/pipeline.ts";
import { pathData } from "../../src/render-svg-marks.ts";
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

  it("preserves even-odd holes under nonlinear coord_transform (#809 phase 9)", () => {
    // Diagonal edges under log10 (x only) need tessellation midpoints — axis-aligned
    // edges stay collinear after an x-only warp, so they never insert verts.
    // ringStarts must use post-projection indices (source [3] would be stale).
    const withHole = geo({
      type: "Polygon",
      coordinates: [
        [
          [1, 1],
          [100, 1],
          [50, 100],
          [1, 1],
        ],
        [
          [20, 20],
          [80, 20],
          [50, 50],
          [20, 20],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [withHole] }, aes({}))
        .geomSf()
        .scales({
          x: { type: "linear", domain: [1, 100], expand: { mult: 0, add: 0 } },
          y: { type: "linear", domain: [1, 100], expand: { mult: 0, add: 0 } },
        })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    expect(batch.closed).toBe(true);
    expect(batch.fillRule).toBe("evenodd");
    expect(batch.ringStarts).toBeDefined();
    expect(batch.ringStarts!.length).toBeGreaterThan(0);
    // Exterior+hole source had 6 verts; log tessellation grows past that so
    // remapped ringStarts cannot equal a naive source-index copy of [3].
    expect(batch.positions.length / 2).toBeGreaterThan(6);
    const holeBreak = batch.ringStarts![0]!;
    expect(holeBreak).toBeGreaterThan(3);
    expect(holeBreak).toBeLessThan(batch.positions.length / 2);

    const scenePanel = model.scene.panels[0]!;
    const vp = model.viewport.panel(scenePanel.id)!;
    const toPlot = (dx: number, dy: number) => {
      const rect = vp.project({
        x: { kind: "continuous", domain: [dx, dx] },
        y: { kind: "continuous", domain: [dy, dy] },
      });
      return { px: (rect.x0 + rect.x1) / 2, py: (rect.y0 + rect.y1) / 2 };
    };
    // Near exterior base (inside fill) vs triangular lake interior.
    const exterior = toPlot(50, 10);
    const hole = toPlot(50, 30);
    expect(model.candidates.hitTest(exterior.px, exterior.py)).not.toBeNull();
    expect(model.candidates.hitTest(hole.px, hole.py)).toBeNull();
  });

  it("drops multi-ring compounds with invalid verts under coord_transform", () => {
    // log10 + limits: projector builds on [1,100] but verts at x=0 are NaN
    // (same pattern as path-topology filled drop). Whole invalid compound drops;
    // valid compound keeps remapped hole topology only.
    const invalid = geo({
      type: "Polygon",
      coordinates: [
        [
          [0, 1],
          [10, 1],
          [10, 10],
          [0, 10],
          [0, 1],
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
    const valid = geo({
      type: "Polygon",
      coordinates: [
        [
          [20, 20],
          [40, 20],
          [40, 40],
          [20, 40],
          [20, 20],
        ],
        [
          [25, 25],
          [35, 25],
          [35, 35],
          [25, 35],
          [25, 25],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [invalid, valid] }, aes({}))
        .geomSf()
        .scales({
          x: { type: "linear", domain: [0, 100], expand: { mult: 0, add: 0 } },
          y: { type: "linear", domain: [0, 100], expand: { mult: 0, add: 0 } },
        })
        .coordTransform({
          x: { transform: "log10", limits: [1, 100], expand: false },
        })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    // Only the valid compound remains as a filled subpath.
    expect(batch.pathOffsets.length - 1).toBe(1);
    expect(batch.fillRule).toBe("evenodd");
    expect(batch.ringStarts).toBeDefined();
    expect(batch.ringStarts!.length).toBe(1);
    // Single surviving compound: one interior-ring break strictly inside path.
    const start = batch.pathOffsets[0]!;
    const end = batch.pathOffsets[1]!;
    const breakAt = batch.ringStarts![0]!;
    expect(breakAt).toBeGreaterThan(start);
    expect(breakAt).toBeLessThan(end);
    expect(model.warnings.some((w) => w.code === "coord-invalid-geometry")).toBe(true);
  });

  it("remaps MultiPolygon holes under nonlinear coord_transform", () => {
    // Diagonal first part tessellates under log10; second solid triangle has no hole.
    const multi = geo({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [1, 1],
            [100, 1],
            [50, 80],
            [1, 1],
          ],
          [
            [20, 15],
            [80, 15],
            [50, 40],
            [20, 15],
          ],
        ],
        [
          [
            [10, 85],
            [40, 85],
            [25, 100],
            [10, 85],
          ],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [multi] }, aes({}))
        .geomSf()
        .scales({
          x: { type: "linear", domain: [1, 100], expand: { mult: 0, add: 0 } },
          y: { type: "linear", domain: [1, 100], expand: { mult: 0, add: 0 } },
        })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(2);
    expect(batch.fillRule).toBe("evenodd");
    expect(batch.ringStarts).toBeDefined();
    // One hole break for the first compound only; second part is solid.
    expect(batch.ringStarts!.length).toBe(1);
    const start0 = batch.pathOffsets[0]!;
    const end0 = batch.pathOffsets[1]!;
    const start1 = batch.pathOffsets[1]!;
    const end1 = batch.pathOffsets[2]!;
    const holeBreak = batch.ringStarts![0]!;
    expect(holeBreak).toBeGreaterThan(start0);
    expect(holeBreak).toBeLessThan(end0);
    // Second compound has no interior break in ringStarts.
    expect(holeBreak < start1 || holeBreak >= end1).toBe(true);
    // Tessellation grew past the 6+3 source verts (closings dropped).
    expect(batch.positions.length / 2).toBeGreaterThan(9);

    const scenePanel = model.scene.panels[0]!;
    const vp = model.viewport.panel(scenePanel.id)!;
    const toPlot = (dx: number, dy: number) => {
      const rect = vp.project({
        x: { kind: "continuous", domain: [dx, dx] },
        y: { kind: "continuous", domain: [dy, dy] },
      });
      return { px: (rect.x0 + rect.x1) / 2, py: (rect.y0 + rect.y1) / 2 };
    };
    expect(model.candidates.hitTest(toPlot(50, 8).px, toPlot(50, 8).py)).not.toBeNull();
    expect(model.candidates.hitTest(toPlot(50, 25).px, toPlot(50, 25).py)).toBeNull();
    expect(model.candidates.hitTest(toPlot(25, 90).px, toPlot(25, 90).py)).not.toBeNull();
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

  it("preserves even-odd holes on GeometryCollection polygon leaves", () => {
    const gc = geo({
      type: "GeometryCollection",
      geometries: [
        {
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
        },
        {
          type: "Polygon",
          coordinates: [
            [
              [5, 0],
              [6, 0],
              [5.5, 1],
              [5, 0],
            ],
          ],
        },
      ],
    });
    const model = runPipeline(
      gg({ geometry: [gc] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    expect(model.warnings.some((w) => w.code === "sf-holes-ignored")).toBe(false);
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(2);
    expect(batch.fillRule).toBe("evenodd");
    // First leaf: exterior 3 + hole 3; second leaf: exterior 3.
    expect(batch.positions.length / 2).toBe(9);
    expect(batch.ringStarts).toBeDefined();
    expect([...batch.ringStarts!]).toEqual([3]);
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

  it("returns an empty scene for zero-row data instead of throwing", () => {
    const model = runPipeline(
      gg({ geometry: [] as string[], rate: [] as number[] }, aes({ fill: "rate" }))
        .geomSf()
        .spec(),
      size,
    );
    expect(model.scene.batches).toEqual([]);
    expect(model.warnings.some((w) => w.code === "empty-layer" || w.code === "empty-data")).toBe(
      true,
    );
  });

  it("pathData with ringStarts emits separate exterior and hole rings", () => {
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
      gg({ geometry: [withHole], rate: [1] }, aes({ fill: "rate" }))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.fillRule).toBe("evenodd");
    expect(batch.ringStarts).toBeDefined();
    const d = pathData(
      batch.positions,
      batch.pathOffsets[0]!,
      batch.pathOffsets[1]!,
      batch.curve,
      true,
      batch.ringStarts,
    );
    // Two closed rings (exterior + hole) — each ends with Z; without ringStarts
    // the d would be a single M…Z joining exterior into the hole.
    const zCount = (d.match(/Z/g) ?? []).length;
    expect(zCount).toBe(2);
    expect((d.match(/M/g) ?? []).length).toBe(2);
  });

  it("pathData cuts each subpath only on its own ring starts", () => {
    // Two compounds, each with a hole: subpath 0 must not cut on subpath 1's
    // break, and subpath 1 must not cut on subpath 0's.
    const twoHoles = geo({
      type: "MultiPolygon",
      coordinates: [
        [
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
        [
          [
            [20, 0],
            [30, 0],
            [30, 10],
            [20, 10],
            [20, 0],
          ],
          [
            [23, 3],
            [27, 3],
            [27, 7],
            [23, 7],
            [23, 3],
          ],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [twoHoles] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.pathOffsets.length - 1).toBe(2);
    const breaks = [...batch.ringStarts!];
    expect(breaks.length).toBe(2);
    // ringStarts is ascending, and one break lands in each subpath window.
    expect(breaks[0]!).toBeLessThan(breaks[1]!);
    expect(breaks[0]!).toBeGreaterThan(batch.pathOffsets[0]!);
    expect(breaks[0]!).toBeLessThan(batch.pathOffsets[1]!);
    expect(breaks[1]!).toBeGreaterThan(batch.pathOffsets[1]!);
    expect(breaks[1]!).toBeLessThan(batch.pathOffsets[2]!);

    for (let s = 0; s < 2; s++) {
      const d = pathData(
        batch.positions,
        batch.pathOffsets[s]!,
        batch.pathOffsets[s + 1]!,
        batch.curve,
        true,
        batch.ringStarts,
      );
      // Exactly two rings — the out-of-window break must not add a third.
      expect((d.match(/M/g) ?? []).length).toBe(2);
      expect((d.match(/Z/g) ?? []).length).toBe(2);
      // Same d the whole-batch break list and a window-local one produce.
      const own = batch.ringStarts!.filter(
        (b) => b > batch.pathOffsets[s]! && b < batch.pathOffsets[s + 1]!,
      );
      expect(d).toBe(
        pathData(
          batch.positions,
          batch.pathOffsets[s]!,
          batch.pathOffsets[s + 1]!,
          batch.curve,
          true,
          own,
        ),
      );
    }
  });

  it("emits ringStarts in ascending vertex order", () => {
    // Consumers window ringStarts by binary search and pair the cuts into
    // rings, so both producers must keep it ascending.
    const nested = geo({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [1, 1],
            [4, 1],
            [4, 4],
            [1, 4],
            [1, 1],
          ],
          [
            [6, 6],
            [9, 6],
            [9, 9],
            [6, 9],
            [6, 6],
          ],
        ],
        [
          [
            [20, 0],
            [30, 0],
            [30, 10],
            [20, 10],
            [20, 0],
          ],
          [
            [23, 3],
            [27, 3],
            [27, 7],
            [23, 7],
            [23, 3],
          ],
        ],
      ],
    });
    const spec = gg({ geometry: [nested] }, aes({})).geomSf();
    const plain = runPipeline(spec.spec(), size);
    const plainBatch = plain.scene.batches[0] as PathsBatch;
    const plainBreaks = [...plainBatch.ringStarts!];
    expect(plainBreaks.length).toBe(3);
    for (let i = 1; i < plainBreaks.length; i++) {
      expect(plainBreaks[i]!).toBeGreaterThan(plainBreaks[i - 1]!);
    }

    // The coord path rewrites ringStarts to post-projection indices; that
    // remap must stay ascending too.
    const projected = runPipeline(
      gg({ geometry: [nested] }, aes({}))
        .geomSf()
        .scales({
          x: { type: "linear", domain: [1, 100], expand: { mult: 0, add: 0 } },
          y: { type: "linear", domain: [1, 100], expand: { mult: 0, add: 0 } },
        })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      size,
    );
    const projectedBatch = projected.scene.batches[0] as PathsBatch;
    const projectedBreaks = [...projectedBatch.ringStarts!];
    expect(projectedBreaks.length).toBeGreaterThan(0);
    for (let i = 1; i < projectedBreaks.length; i++) {
      expect(projectedBreaks[i]!).toBeGreaterThan(projectedBreaks[i - 1]!);
    }
  });

  it("keeps the closing vertex on a closed LineString (open path draw)", () => {
    const closedLine = geo({
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [closedLine] }, aes({}))
        .geomSf()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.closed).toBeFalsy();
    // 4 vertices → 8 position floats (closing edge retained for open paths).
    expect(batch.positions.length).toBe(8);
  });

  it("honors params.size/alpha for Point sf layers", () => {
    const model = runPipeline(
      gg(
        {
          geometry: [geo({ type: "Point", coordinates: [1, 2] })],
        },
        aes({}),
      )
        .geomSf({ size: 12, alpha: 0.4 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PointsBatch;
    expect(batch.size).toBe(12);
    expect(batch.alpha).toBe(0.4);
  });

  it("applies coordTransform to Point sf layers", () => {
    // Points must take the early panel-frame projector (pathLike false for
    // sf.kind === "point"); otherwise dots sit on linear pixels under log10.
    const model = runPipeline(
      gg(
        {
          geometry: [
            geo({ type: "Point", coordinates: [10, 1] }),
            geo({ type: "Point", coordinates: [100, 1] }),
          ],
        },
        aes({}),
      )
        .geomSf()
        .scales({
          x: { type: "linear", domain: [1, 1000], expand: { mult: 0, add: 0 } },
          y: { type: "linear", domain: [0, 2], expand: { mult: 0, add: 0 } },
        })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PointsBatch;
    expect(batch.kind).toBe("points");
    const panelW = model.scene.panels[0]!.width;
    // log10 domain [0, 3]: 10 → 1/3, 100 → 2/3 of panel width.
    expect(batch.positions[0]).toBeCloseTo(panelW / 3, 1);
    expect(batch.positions[2]).toBeCloseTo((2 * panelW) / 3, 1);
  });

  it("honors params.linewidth/alpha for LineString sf layers", () => {
    const line = geo({
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [line] }, aes({}))
        .geomSf({ linewidth: 3.5, alpha: 0.25 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.linewidth).toBe(3.5);
    expect(batch.alpha).toBe(0.25);
  });
  it("defaults stat to sf (ggplot2 stat_sf)", () => {
    const spec = gg({ geometry: [polyA] }, aes({}))
      .geomSf()
      .spec();
    expect(spec.layers[0]?.stat).toBe("sf");
  });
});
