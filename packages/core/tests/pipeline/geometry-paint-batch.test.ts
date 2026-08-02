/**
 * #1309 — geometry emitters batch paintVector / mappedPaintVector once per
 * style vector, not once per item. Colors must match the known palette; call
 * count is the acceptance seam for pseudo-batching.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it, spyOn } from "bun:test";

import { trainContinuous } from "../../src/scales/train.ts";
import { DEFAULT_MISSING_COLOR } from "../../src/scales/engine.ts";
import { curveBatch } from "../../src/pipeline/geometry-curve.ts";
import { emitDataSegments } from "../../src/pipeline/geometry-segments-data.ts";
import {
  createSegmentEmitters,
  type SegmentEmitBuffers,
} from "../../src/pipeline/geometry-segments-emit.ts";
import { writeLineSubpaths } from "../../src/pipeline/geometry-paths-line-write.ts";
import { polygonBatch } from "../../src/pipeline/geometry-paths-polygon.ts";
import { areaGroupFillOf } from "../../src/pipeline/geometry-paths-area-fill.ts";
import { ribbonBatches } from "../../src/pipeline/geometry-ribbon.ts";
import * as geometryStyle from "../../src/pipeline/geometry-style.ts";
import type { Frame } from "../../src/pipeline/geometry-shared.ts";
import type { LayerFrame, ResolvedColorScale } from "../../src/pipeline/types.ts";
import type { ResolvedStyleScales } from "../../src/pipeline/geometry-style.ts";

const PALETTE: Record<string, string> = {
  a: "#ff0000",
  b: "#00ff00",
  c: "#0000ff",
};

function stubScale(map: Record<string, string> = PALETTE): ResolvedColorScale {
  return fromPartial<ResolvedColorScale>({
    kind: "ordinal",
    scale: {
      colorOf: (value: unknown) =>
        value === null || value === undefined ? undefined : map[`${value as string | number}`],
      naValue: DEFAULT_MISSING_COLOR,
      unknownValue: DEFAULT_MISSING_COLOR,
    },
  });
}

function continuousFx(w = 100, h = 50): Frame {
  const xScale = trainContinuous([[0, 10]], {}).scale;
  const yScale = trainContinuous([[0, 10]], {}).scale;
  return fromPartial<Frame>({
    innerWidth: w,
    innerHeight: h,
    xScale,
    yScale,
  });
}

const emptyStyles = fromPartial<ResolvedStyleScales>({
  linewidth: null,
  alpha: null,
  linetype: null,
  size: null,
  shape: null,
});

function baseBinding(geom: string, extra: Record<string, unknown> = {}) {
  return {
    index: 0,
    layer: { geom, params: {} },
    color: { field: null, constant: null, scaledConstant: null, statColumn: null },
    fill: { field: null, constant: null, scaledConstant: null, statColumn: null },
    linewidth: { field: null, constant: null, scaledConstant: null, statColumn: null },
    alpha: { field: null, constant: null, scaledConstant: null, statColumn: null },
    linetype: { field: null, constant: null, scaledConstant: null, statColumn: null },
    ...extra,
  };
}

describe("emitDataSegments paint batch (#1309)", () => {
  it("resolves mapped strokes once for all kept rows", () => {
    const n = 4;
    const frame = fromAny<LayerFrame>({
      n,
      xNumeric: Float64Array.of(1, 2, 3, 4),
      xValues: null,
      yNumeric: null,
      yValues: null,
      rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
      colorValues: ["a", "b", null, "c"],
      binding: {
        ...baseBinding("vline"),
        ruleForm: "vertical",
        color: { field: "g", constant: null, scaledConstant: null, statColumn: null },
      },
    });
    const fx = continuousFx();
    const capacity = n;
    const buffers: SegmentEmitBuffers = {
      segments: new Float32Array(capacity * 4),
      rowIndex: new Uint32Array(capacity),
      kept: 0,
      removed: 0,
    };
    const strokes = Array.from<string>({ length: capacity });
    const styleRows = new Uint32Array(capacity);
    const { pushVertical, pushHorizontal } = createSegmentEmitters({ fx, buffers });
    const mappedSpy = spyOn(geometryStyle, "mappedPaintVector");

    emitDataSegments({
      frame,
      fx,
      color: stubScale(),
      wantsColors: true,
      pushVertical,
      pushHorizontal,
      buffers,
      strokes,
      styleRows,
    });

    expect(buffers.kept).toBe(4);
    expect(mappedSpy).toHaveBeenCalledTimes(1);
    expect(strokes.slice(0, 4)).toEqual(["#ff0000", "#00ff00", DEFAULT_MISSING_COLOR, "#0000ff"]);
    mappedSpy.mockRestore();
  });
});

describe("writeLineSubpaths paint batch (#1309)", () => {
  it("resolves one stroke paint vector for all subpaths", () => {
    const frame = fromAny<LayerFrame>({
      n: 6,
      xNumeric: Float64Array.of(0, 1, 2, 0, 1, 2),
      yNumeric: Float64Array.of(0, 1, 0, 2, 3, 2),
      xValues: null,
      yValues: null,
      rowIndex: Uint32Array.from({ length: 6 }, (_, i) => i),
      colorValues: ["a", "a", "a", "b", "b", "b"],
      binding: {
        ...baseBinding("line"),
        color: { field: "g", constant: null, scaledConstant: null, statColumn: null },
      },
    });
    const paintSpy = spyOn(geometryStyle, "paintVector");
    const out = writeLineSubpaths({
      frame,
      fx: continuousFx(),
      color: stubScale(),
      subpaths: [
        [0, 1, 2],
        [3, 4, 5],
      ],
    });
    expect(paintSpy).toHaveBeenCalledTimes(1);
    expect(out.strokes).toEqual(["#ff0000", "#00ff00"]);
    paintSpy.mockRestore();
  });

  it("keeps constant fallback colours when the channel is unmapped", () => {
    const frame = fromAny<LayerFrame>({
      n: 4,
      xNumeric: Float64Array.of(0, 1, 0, 1),
      yNumeric: Float64Array.of(0, 1, 0, 1),
      xValues: null,
      yValues: null,
      rowIndex: Uint32Array.from({ length: 4 }, (_, i) => i),
      colorValues: null,
      binding: {
        ...baseBinding("line"),
        color: { field: null, constant: "#112233", scaledConstant: null, statColumn: null },
      },
    });
    const paintSpy = spyOn(geometryStyle, "paintVector");
    const out = writeLineSubpaths({
      frame,
      fx: continuousFx(),
      color: null,
      subpaths: [
        [0, 1],
        [2, 3],
      ],
    });
    expect(paintSpy).toHaveBeenCalledTimes(1);
    expect(out.strokes).toEqual(["#112233", "#112233"]);
    paintSpy.mockRestore();
  });
});

describe("curveBatch paint batch (#1309)", () => {
  it("resolves one stroke paint vector for all kept curves", () => {
    const frame = fromAny<LayerFrame>({
      n: 3,
      xNumeric: Float64Array.of(0, 2, 4),
      yNumeric: Float64Array.of(0, 1, 2),
      xend: Float64Array.of(1, 3, 5),
      yend: Float64Array.of(1, 2, 3),
      xValues: null,
      yValues: null,
      xendValues: null,
      yendValues: null,
      rowIndex: Uint32Array.from({ length: 3 }, (_, i) => i),
      colorValues: ["a", "b", "c"],
      binding: {
        ...baseBinding("curve"),
        color: { field: "g", constant: null, scaledConstant: null, statColumn: null },
      },
    });
    const paintSpy = spyOn(geometryStyle, "paintVector");
    const batch = curveBatch(frame, continuousFx(), stubScale(), emptyStyles, []);
    expect(batch).not.toBeNull();
    expect(paintSpy).toHaveBeenCalledTimes(1);
    expect(batch!.strokes).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    paintSpy.mockRestore();
  });
});

describe("polygonBatch paint batch (#1309)", () => {
  it("resolves fill and stroke paint vectors once across groups", () => {
    const frame = fromAny<LayerFrame>({
      n: 6,
      xNumeric: Float64Array.of(0, 1, 0.5, 2, 3, 2.5),
      yNumeric: Float64Array.of(0, 0, 1, 0, 0, 1),
      xValues: null,
      yValues: null,
      groups: [0, 0, 0, 1, 1, 1],
      rowIndex: Uint32Array.from({ length: 6 }, (_, i) => i),
      colorValues: ["a", "a", "a", "b", "b", "b"],
      fillValues: ["a", "a", "a", "b", "b", "b"],
      binding: {
        ...baseBinding("polygon"),
        color: { field: "g", constant: null, scaledConstant: null, statColumn: null },
        fill: { field: "g", constant: null, scaledConstant: null, statColumn: null },
      },
    });
    const paintSpy = spyOn(geometryStyle, "paintVector");
    const batch = polygonBatch(frame, continuousFx(), stubScale(), stubScale(), emptyStyles, []);
    expect(batch).not.toBeNull();
    // One fill vector + one stroke vector (not one call per group).
    expect(paintSpy).toHaveBeenCalledTimes(2);
    expect(batch!.fills).toEqual(["#ff0000", "#00ff00"]);
    expect(batch!.strokes).toEqual(["#ff0000", "#00ff00"]);
    paintSpy.mockRestore();
  });
});

describe("areaGroupFillOf paint batch helper (#1309)", () => {
  it("areaGroupFillsOf resolves many groups in one paintVector call", async () => {
    const { areaGroupFillsOf } = await import("../../src/pipeline/geometry-paths-area-fill.ts");
    const frame = fromAny<LayerFrame>({
      fillValues: ["a", "b", "c"],
      binding: {
        fill: { field: "g", constant: null, scaledConstant: null, statColumn: null },
      },
    });
    const paintSpy = spyOn(geometryStyle, "paintVector");
    const fills = areaGroupFillsOf(frame, stubScale(), [0, 2, 1]);
    expect(paintSpy).toHaveBeenCalledTimes(1);
    expect(fills).toEqual(["#ff0000", "#0000ff", "#00ff00"]);
    // Single-group helper stays equivalent.
    expect(areaGroupFillOf(frame, stubScale(), [2])).toBe("#0000ff");
    paintSpy.mockRestore();
  });

  it("returns the constant fill when unmapped", async () => {
    const { areaGroupFillsOf } = await import("../../src/pipeline/geometry-paths-area-fill.ts");
    const frame = fromAny<LayerFrame>({
      fillValues: null,
      binding: {
        fill: { field: null, constant: "#cde", scaledConstant: null, statColumn: null },
      },
    });
    expect(areaGroupFillsOf(frame, null, [0, 1])).toEqual(["#cde", "#cde"]);
  });
});

describe("ribbonBatches paint batch (#1309)", () => {
  it("resolves fill and stroke paint vectors once across runs", () => {
    const frame = fromAny<LayerFrame>({
      n: 6,
      xNumeric: Float64Array.of(0, 1, 2, 0, 1, 2),
      yNumeric: Float64Array.of(1, 1, 1, 1, 1, 1),
      ymin: Float64Array.of(0, 0, 0, 0, 0, 0),
      ymax: Float64Array.of(1, 2, 1, 2, 3, 2),
      xValues: null,
      yValues: null,
      groups: [0, 0, 0, 1, 1, 1],
      rowIndex: Uint32Array.from({ length: 6 }, (_, i) => i),
      colorValues: ["a", "a", "a", "b", "b", "b"],
      fillValues: ["a", "a", "a", "b", "b", "b"],
      binding: {
        ...baseBinding("ribbon"),
        color: { field: "g", constant: null, scaledConstant: null, statColumn: null },
        fill: { field: "g", constant: null, scaledConstant: null, statColumn: null },
        ribbonOrientation: "x",
      },
    });
    const paintSpy = spyOn(geometryStyle, "paintVector");
    const batches = ribbonBatches(frame, continuousFx(), stubScale(), stubScale(), emptyStyles, []);
    expect(batches.length).toBeGreaterThan(0);
    // At most one fill vector + one stroke vector for the styleRows set.
    const paintCalls = paintSpy.mock.calls.filter(
      (call) => call[1] === "fill" || call[1] === "color",
    );
    expect(paintCalls.length).toBeLessThanOrEqual(2);
    expect(paintCalls.some((c) => c[1] === "fill")).toBe(true);
    expect(paintCalls.some((c) => c[1] === "color")).toBe(true);
    const closed = batches.find((b) => b.closed === true);
    expect(closed?.fills).toEqual(["#ff0000", "#00ff00"]);
    paintSpy.mockRestore();
  });
});
