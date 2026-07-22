/**
 * Geometry characterization — paths-boxplot.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";
import type { LayerFrame } from "../../src/pipeline/types.ts";
import type { Frame } from "../../src/pipeline/geometry-shared.ts";

describe("appendClosedBandEdges — shared closed ribbon vertices", () => {
  it("writes upper edge ascending then lower edge descending", async () => {
    const { appendClosedBandEdges } = await import("../../src/pipeline/geometry-paths-closed.ts");
    const positions = new Float32Array(16);
    const rowIndex = new Uint32Array(8);
    const frame = fromAny<LayerFrame>({
      xNumeric: new Float64Array([0, 1]),
      xValues: null,
      rowIndex: new Uint32Array([10, 11]),
      ymin: new Float64Array([0.2, 0.3]),
      ymax: new Float64Array([0.8, 0.9]),
    });
    const fx = fromPartial<Frame>({
      innerWidth: 100,
      innerHeight: 200,
      xScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      yScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
    });
    const cursor = appendClosedBandEdges({
      positions,
      rowIndex,
      cursor: 0,
      rows: [0, 1],
      frame,
      fx,
      yTop: frame.ymax!,
      yBottom: frame.ymin!,
    });
    expect(cursor).toBe(4);
    // upper: row0 (0, 0.8) -> px (0, 200-160)=(0,40); row1 (1,0.9)->(100,20)
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(40);
    expect(positions[2]).toBeCloseTo(100);
    expect(positions[3]).toBeCloseTo(20);
    // lower reverse: row1 (1,0.3)->(100,140); row0 (0,0.2)->(0,160)
    expect(positions[4]).toBeCloseTo(100);
    expect(positions[5]).toBeCloseTo(140);
    expect(positions[6]).toBeCloseTo(0);
    expect(positions[7]).toBeCloseTo(160);
    expect([...rowIndex.subarray(0, 4)]).toEqual([10, 11, 11, 10]);
  });
});

describe("layoutBoxplotBody — hinge/whisker collection", () => {
  it("returns null when box extras or scales are unsuitable", async () => {
    const { layoutBoxplotBody } =
      await import("../../src/pipeline/geometry-boxplot-body-layout.ts");
    const frame = fromAny<LayerFrame>({
      binding: { index: 0, layer: { params: {} } },
      n: 1,
      box: null,
      ymin: null,
      ymax: null,
    });
    const fx = fromPartial<Frame>({
      xScale: { type: "linear" },
      yScale: { type: "linear" },
      innerWidth: 100,
      innerHeight: 100,
    });
    expect(layoutBoxplotBody(frame, fx, [])).toBeNull();
  });
});

describe("BOX_MEDIAN_FATTEN", () => {
  it("matches ggplot2 fatten default of 2", async () => {
    const { BOX_MEDIAN_FATTEN } =
      await import("../../src/pipeline/geometry-boxplot-body-batches-parts.ts");
    expect(BOX_MEDIAN_FATTEN).toBe(2);
  });
});

describe("writeSmoothLineGeometry", () => {
  it("writes one path offset per group and maps y into panel px", async () => {
    const { writeSmoothLineGeometry } =
      await import("../../src/pipeline/geometry-smooth-line-write.ts");
    const frame = fromAny({
      binding: { color: { constant: "#abc", scaledConstant: null } },
      xNumeric: new Float64Array([0, 1]),
      yNumeric: new Float64Array([0, 1]),
      xValues: null,
      colorValues: null,
      rowIndex: new Uint32Array([10, 11]),
    });
    const fx = fromAny({
      xScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      yScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      innerWidth: 100,
      innerHeight: 50,
    });
    const geom = writeSmoothLineGeometry({
      frame,
      fx,
      color: null,
      groupRows: [[0, 1]],
    });
    expect([...geom.pathOffsets]).toEqual([0, 2]);
    expect([...geom.rowIndex]).toEqual([10, 11]);
    expect(geom.positions[0]).toBe(0);
    expect(geom.positions[1]).toBe(50);
    expect(geom.positions[2]).toBe(100);
    expect(geom.positions[3]).toBe(0);
    expect(geom.strokes).toEqual(["#abc"]);
  });
});

describe("areaGroupFillOf", () => {
  it("uses the constant fill when no scaled fill is mapped", async () => {
    const { areaGroupFillOf } = await import("../../src/pipeline/geometry-paths-area-fill.ts");
    const frame = fromAny({
      binding: { fill: { constant: "#cde", scaledConstant: null } },
      fillValues: null,
    });
    expect(areaGroupFillOf(frame, null, [0])).toBe("#cde");
  });
});
