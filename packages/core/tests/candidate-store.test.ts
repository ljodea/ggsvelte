import { describe, expect, it, spyOn } from "bun:test";

import {
  buildCandidateStore,
  canonicalAxisToken,
  type CandidateDatum,
} from "../src/candidate-store.ts";
import type { Scene } from "../src/scene.ts";

function scene(): Scene {
  return {
    width: 200,
    height: 120,
    panels: [
      {
        id: "panel:all",
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        strip: "",
        axisX: [],
        axisY: [],
        grid: { x: [], y: [] },
      },
    ],
    batches: [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20, 10, 40, 50, 30]),
        rowIndex: new Uint32Array([0, 1, 2]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "points",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([10, 25, 10, 25]),
        rowIndex: new Uint32Array([3, 4]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ],
    axes: { x: { ticks: [], title: "" }, y: { ticks: [], title: "" } },
    grid: { x: [], y: [] },
    legends: [],
    theme: {} as Scene["theme"],
    title: "",
    subtitle: "",
    caption: "",
  };
}

function sceneWithPoints(points: readonly (readonly [number, number])[]): Scene {
  const result = scene();
  result.batches = [
    {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from(points.flat()),
      rowIndex: Uint32Array.from(points.map((_, index) => index)),
      size: 3,
      alpha: 1,
      shape: "circle",
      fill: null,
    },
  ];
  return result;
}

const data: CandidateDatum[] = [
  { xValue: new Date(0), yValue: 20, seriesId: 0, seriesRank: 1 },
  { xValue: new Date(0), yValue: 40, seriesId: 0, seriesRank: 1 },
  { xValue: 50, yValue: 30, seriesId: 0, seriesRank: 1 },
  { xValue: new Date(0), yValue: 25, seriesId: 8, seriesRank: 0 },
  { xValue: new Date(0), yValue: 25, seriesId: 8, seriesRank: 0 },
];

describe("canonicalAxisToken", () => {
  it("normalizes supported values and excludes invalid buckets", () => {
    expect(canonicalAxisToken(new Date(12))).toEqual({ kind: "number", value: 12 });
    expect(canonicalAxisToken(-0)).toEqual({ kind: "number", value: 0 });
    expect(canonicalAxisToken("a")).toEqual({ kind: "string", value: "a" });
    expect(canonicalAxisToken(false)).toEqual({ kind: "boolean", value: false });
    expect(canonicalAxisToken(null)).toBeNull();
    expect(canonicalAxisToken(Number.NaN)).toBeNull();
    expect(canonicalAxisToken(Infinity)).toBeNull();
  });
});

describe("CandidateStore", () => {
  const store = buildCandidateStore(scene(), {
    epoch: 7,
    datum: ({ candidateIndex }) => data[candidateIndex]!,
  });

  it("defers semantic/index construction until interaction first reads the store", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(scene(), {
      datum: ({ candidateIndex }) => {
        resolutions++;
        return data[candidateIndex]!;
      },
    });
    expect(lazy.size).toBe(5);
    expect(resolutions).toBe(0);
    expect(lazy.candidate(0)?.id).toBe(0);
    expect(resolutions).toBe(5);
  });

  it("uses exact geometry for containment and rectangle intersections", () => {
    const rectScene = scene();
    rectScene.batches = [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects: new Float32Array([20, 20, 40, 40]),
        rowIndex: new Uint32Array([0]),
        fill: null,
        alpha: 1,
      },
    ];
    const rectStore = buildCandidateStore(rectScene, { datum: () => ({ xValue: 1, yValue: 2 }) });
    expect(rectStore.nearest(22, 55, { mode: "exact", maxDistance: 0 })?.id).toBe(0);
    expect(rectStore.queryRect(15, 30, 25, 35)).toEqual(new Uint32Array([0]));
    expect(rectStore.candidate(0)?.autoMode).toBe("exact");
    expect(rectStore.nearest(22, 55, { mode: "auto", maxDistance: 0 })?.mode).toBe("exact");
  });

  it("infers a semantic dominant axis for standalone segments", () => {
    const segmentScene = scene();
    segmentScene.batches = [
      {
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments: new Float32Array([20, 0, 20, 100, 0, 40, 100, 40]),
        rowIndex: new Uint32Array([0, 1]),
        stroke: null,
        linewidth: 1,
        alpha: 1,
      },
    ];
    const segmentStore = buildCandidateStore(segmentScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: primitiveIndex === 0 ? 20 : null,
        yValue: primitiveIndex === 1 ? 40 : null,
      }),
    });

    expect(segmentStore.candidate(0)?.autoMode).toBe("x");
    expect(segmentStore.candidate(1)?.autoMode).toBe("y");
    expect(segmentStore.nearest(22, 90, { mode: "auto", maxDistance: 3 })).toMatchObject({
      id: 0,
      mode: "x",
    });
    expect(segmentStore.nearest(90, 42, { mode: "auto", maxDistance: 3 })).toMatchObject({
      id: 1,
      mode: "y",
    });
  });

  it("uses polygon containment for exact filled-path lookup", () => {
    const areaScene = scene();
    areaScene.batches = [
      {
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([20, 20, 80, 20, 50, 80]),
        rowIndex: new Uint32Array([0, 1, 2]),
        pathOffsets: new Uint32Array([0, 3]),
        strokes: [null],
        fills: [null],
        closed: true,
        linewidth: 0,
        alpha: 1,
        curve: "linear",
      },
    ];
    const areaStore = buildCandidateStore(areaScene);
    expect(areaStore.nearest(25, 25, { mode: "exact", maxDistance: 0 })?.id).toBe(0);
  });

  it("rejects segment bounding boxes that do not geometrically intersect a brush", () => {
    const segmentScene = scene();
    segmentScene.batches = [
      {
        kind: "segments",
        layerIndex: 0,
        panelIndex: 0,
        segments: new Float32Array([0, 0, 10, 10]),
        rowIndex: new Uint32Array([0]),
        stroke: null,
        linewidth: 1,
        alpha: 1,
      },
    ];
    const segmentStore = buildCandidateStore(segmentScene);
    expect(segmentStore.queryRect(0, 9, 1, 10)).toEqual(new Uint32Array());
    expect(segmentStore.queryRect(4, 4, 6, 6)).toEqual(new Uint32Array([0]));
  });

  it("releases lazy resolvers and initialized candidate arrays on dispose", () => {
    let resolutions = 0;
    const lazy = buildCandidateStore(scene(), {
      datum: () => {
        resolutions++;
        return {};
      },
    });
    lazy.dispose();
    expect(lazy.size).toBe(0);
    expect(lazy.candidate(0)).toBeNull();
    expect(lazy.x).toHaveLength(0);
    expect(resolutions).toBe(0);

    const initialized = buildCandidateStore(scene());
    expect(initialized.candidate(0)).not.toBeNull();
    initialized.dispose();
    expect(initialized.size).toBe(0);
    expect(initialized.candidate(0)).toBeNull();
    expect(initialized.x).toHaveLength(0);
  });

  it("owns typed anchors and exposes stable candidate facts", () => {
    expect(store.x).toBeInstanceOf(Float32Array);
    expect(store.y).toBeInstanceOf(Float32Array);
    expect(store.size).toBe(5);
    expect(store.candidate(0)).toMatchObject({
      id: 0,
      epoch: 7,
      panelId: "panel:all",
      rowIndex: 0,
      seriesId: 0,
    });
  });

  it("finds dominant-axis and euclidean nearest candidates", () => {
    expect(store.nearest(12, 39, { mode: "x", maxDistance: 3 })?.id).toBe(1);
    expect(store.nearest(48, 31, { mode: "xy", maxDistance: 4 })?.id).toBe(2);
    expect(store.nearest(80, 80, { mode: "xy", maxDistance: 2 })).toBeNull();
  });

  it("excludes invalid logical values from dominant-axis inspection", () => {
    const invalid = [
      ...data.slice(0, 3),
      { xValue: Number.NaN, yValue: 2, seriesId: 9 },
      ...data.slice(3),
    ];
    const withInvalid = scene();
    const points = withInvalid.batches[0]!;
    if (points.kind !== "points") throw new Error("fixture");
    points.positions = new Float32Array([...points.positions, 80, 2]);
    points.rowIndex = new Uint32Array([...points.rowIndex, 5]);
    const invalidStore = buildCandidateStore(withInvalid, {
      datum: ({ candidateIndex }) => invalid[candidateIndex]!,
    });
    expect(invalidStore.nearest(80, 2, { mode: "x", maxDistance: 1 })).toBeNull();
  });

  it("returns a compact canonical bucket and one representative per series", () => {
    const grouped = store.group(1, "x");
    expect(grouped?.axisValue).toEqual(new Date(0));
    expect(grouped?.memberIds).toEqual(new Uint32Array([3, 1]));
    expect(grouped?.focusId).toBe(1);
    expect(grouped?.range.end).toBeGreaterThan(grouped?.range.start ?? 0);
  });

  it("cycles coincident marks, traverses deterministically, and returns integer rect ids", () => {
    expect(store.cycle(3, 1)).toBe(4);
    expect(store.cycle(4, 1)).toBe(3);
    expect(store.traverse(0, "down")).toBe(3);
    expect(store.queryRect(5, 15, 15, 45)).toEqual(new Uint32Array([0, 3, 4, 1]));
  });
});

describe("candidate grouping hot path", () => {
  it("uses preordered series boundaries without sorting during resolution", () => {
    const plotScene = sceneWithPoints([
      [10, 30],
      [10, 10],
      [10, 20],
    ]);
    const store = buildCandidateStore(plotScene, {
      datum: ({ primitiveIndex }) => ({
        xValue: 1,
        yValue: primitiveIndex,
        seriesId: primitiveIndex,
        seriesRank: 2 - primitiveIndex,
      }),
    });
    // Force the lazy construction/sort boundary before policing resolution.
    void store.x;
    const sortSpy = spyOn(Array.prototype, "toSorted").mockImplementation(function () {
      throw new Error("group resolution sorted");
    });
    try {
      expect([...store.group(0, "x")!.memberIds]).toEqual([2, 1, 0]);
    } finally {
      sortSpy.mockRestore();
    }
  });

  it("does not produce an axis target for an invalid logical bucket", () => {
    const plotScene = sceneWithPoints([[10, 10]]);
    const store = buildCandidateStore(plotScene, {
      datum: () => ({ xValue: Number.NaN, yValue: 1 }),
    });
    expect(store.group(0, "x")).toBeNull();
    expect(store.nearest(10, 10, { mode: "x", maxDistance: 100 })).toBeNull();
  });
});
