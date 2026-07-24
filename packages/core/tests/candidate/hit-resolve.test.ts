import { describe, expect, it } from "bun:test";

import { resolveTopmostHit } from "../../src/candidate-hit-resolve.ts";
import { buildCandidateStoreIndexes } from "../../src/candidate-store-indexes.ts";
import { buildCandidateSpatialQuery } from "../../src/candidate-store-spatial.ts";
import { scene } from "./fixtures.ts";

function resolve(plot: ReturnType<typeof scene>, px: number, py: number, hitTolerance = 3) {
  const indexes = buildCandidateStoreIndexes(plot, { hitTolerance });
  const query = buildCandidateSpatialQuery(indexes);
  return resolveTopmostHit(
    {
      scene: indexes.scene,
      hitTolerance: indexes.hitTolerance,
      batchIds: indexes.batchIds,
      primitiveIds: indexes.primitiveIds,
      panelIds: indexes.panelIds,
      xs: indexes.xs,
      ys: indexes.ys,
      pointBatchIndexes: query.pointBatchIndexes,
      addExtendedIntersecting: (loX, loY, hiX, hiY, into) => {
        query.addExtendedIntersecting(loX, loY, hiX, hiY, into);
      },
      exactDistance: (id, x, y, pathContainment) => query.exactDistance(id, x, y, pathContainment),
      fact: (id) => indexes.fact(id),
    },
    px,
    py,
  );
}

describe("resolveTopmostHit", () => {
  it("picks later paint order for overlapping exact geometry", () => {
    const rects = scene();
    rects.batches = [0, 1].map((layerIndex) => ({
      kind: "rects" as const,
      layerIndex,
      panelIndex: 0,
      rects: new Float32Array([10, 10, 40, 40]),
      rowIndex: new Uint32Array([layerIndex]),
      fill: null,
      alpha: 1,
    }));
    expect(resolve(rects, 20, 20)?.id).toBe(1);
    expect(resolve(rects, 5, 20)).toBeNull();
  });

  it("resolves stroked paths by stable edge, never glyphs", () => {
    const paths = scene();
    paths.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20, 30, 20, 10, 20, 30, 20]),
        rowIndex: new Uint32Array([0, 1, 2, 3]),
        pathOffsets: new Uint32Array([0, 2, 4]),
        strokes: [null, null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
      {
        kind: "glyphs",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([20, 20]),
        rowIndex: new Uint32Array([4]),
        text: ["label"],
        fill: null,
        size: 12,
        alpha: 1,
      },
    ];
    // Later subpath wins; equidistant edge chooses its first vertex.
    expect(resolve(paths, 20, 20)?.id).toBe(2);
  });

  it("chooses the nearer semantic anchor on a shared tessellated edge", () => {
    const tessellated = scene();
    tessellated.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([0, 10, 10, 10, 20, 10, 30, 10]),
        rowIndex: new Uint32Array([0, 1, 1, 1]),
        semanticAnchors: new Uint8Array([1, 0, 0, 1]),
        semanticIndex: new Uint32Array([0, 1, 1, 1]),
        pathOffsets: new Uint32Array([0, 4]),
        strokes: [null],
        linewidth: 2,
        alpha: 1,
        curve: "linear",
      },
    ];
    expect(resolve(tessellated, 2, 10)?.primitiveIndex).toBe(0);
    expect(resolve(tessellated, 28, 10)?.primitiveIndex).toBe(3);
  });
});
