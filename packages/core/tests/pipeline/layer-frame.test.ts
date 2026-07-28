/**
 * Contract for the single post-stat LayerFrame constructor (#1077).
 * Expected values are independent literals / known transforms, not re-derived
 * from the implementation under test.
 */
import { describe, expect, it } from "bun:test";
import { fromPartial } from "@total-typescript/shoehorn";

import { NO_ROW } from "../../src/pipeline/types.ts";
import type { LayerBinding } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";
import { scaleTransform } from "../../src/scales/transform.ts";
import { statLayerFrame } from "../../src/pipeline/layer-frame.ts";

const emptyStyle = {
  field: null,
  statColumn: null,
  constant: null,
  scaledConstant: null,
};

function binding(partial: {
  yStatColumn?: string | null;
  yTransform?: LayerBinding["yTransform"];
  colorField?: string | null;
  colorStat?: string | null;
  sizeField?: string | null;
  sizeStat?: string | null;
  labelField?: string | null;
}): LayerBinding {
  return fromPartial<LayerBinding>({
    layer: { geom: "point", aes: {} },
    index: 0,
    yStatColumn: partial.yStatColumn ?? null,
    yTransform: partial.yTransform,
    color: {
      field: partial.colorField ?? null,
      statColumn: partial.colorStat ?? null,
      constant: null,
      scaledConstant: null,
    },
    fill: { field: null, constant: null, scaledConstant: null },
    size: { ...emptyStyle, field: partial.sizeField ?? null, statColumn: partial.sizeStat ?? null },
    linewidth: emptyStyle,
    alpha: emptyStyle,
    shape: emptyStyle,
    linetype: emptyStyle,
    labelField: partial.labelField ?? null,
  });
}

const table = ColumnTable.fromRows([{ x: 1 }, { x: 2 }]);
const nullColumnOf = (_field: string | null) => null;

describe("statLayerFrame (#1077)", () => {
  it("builds a core frame with NO_ROW lineage and empty extras", () => {
    const x = new Float64Array([1, 2, 3]);
    const y = new Float64Array([0.1, 0.5, 0.9]);
    const groups = [0, 0, 1];
    const inputGroups = [0, 1];
    const b = binding({});

    const frame = statLayerFrame({
      binding: b,
      table,
      n: 3,
      x: { numeric: x },
      y: { numeric: y },
      groups,
      inputGroups,
      columnOf: nullColumnOf,
      lineage: "none",
    });

    expect(frame.binding).toBe(b);
    expect(frame.table).toBe(table);
    expect(frame.n).toBe(3);
    expect(frame.xValues).toBeNull();
    expect(frame.xNumeric).toBe(x);
    expect(frame.yValues).toBeNull();
    expect(frame.yNumeric).toBe(y);
    expect(frame.groups).toEqual(groups);
    expect(frame.inputGroups).toEqual(inputGroups);
    expect(frame.inputSourceRows).toBeNull();
    expect(Array.from(frame.rowIndex)).toEqual([NO_ROW, NO_ROW, NO_ROW]);
    expect(frame.colorValues).toBeNull();
    expect(frame.fillValues).toBeNull();
    expect(frame.sizeValues).toBeNull();
    expect(frame.linewidthValues).toBeNull();
    expect(frame.alphaValues).toBeNull();
    expect(frame.shapeValues).toBeNull();
    expect(frame.linetypeValues).toBeNull();
    expect(frame.labelValues).toBeNull();
    expect(frame.ymin).toBeNull();
    expect(frame.ymax).toBeNull();
    expect(frame.xmin).toBeNull();
    expect(frame.xmax).toBeNull();
    expect(frame.bin).toBeNull();
    expect(frame.box).toBeNull();
    expect(frame.smooth).toBeNull();
    expect(frame.sf).toBeNull();
    expect(frame.xIntercepts).toEqual([]);
    expect(frame.yIntercepts).toEqual([]);
  });

  it("resolves y via yStatColumn default and forwards the measure once", () => {
    const ecdf = new Float64Array([0.25, 0.5, 1]);
    const b = binding({
      yStatColumn: null,
      yTransform: {
        transform: scaleTransform("sqrt"),
        sourceLimits: null,
        oob: "censor",
        naValue: null,
      },
    });

    const frame = statLayerFrame({
      binding: b,
      table,
      n: 3,
      x: { numeric: new Float64Array([1, 2, 3]) },
      y: { column: "ecdf", fallback: ecdf },
      groups: [0, 0, 0],
      inputGroups: [0, 0],
      columns: { ecdf },
      columnOf: nullColumnOf,
      lineage: "none",
    });

    // sqrt of [0.25, 0.5, 1] = [0.5, ~0.707, 1]
    expect(Array.from(frame.yNumeric!)).toEqual([Math.sqrt(0.25), Math.sqrt(0.5), Math.sqrt(1)]);
  });

  it("prefers binding.yStatColumn over the column default name", () => {
    const density = new Float64Array([2, 4]);
    const count = new Float64Array([10, 20]);
    const b = binding({ yStatColumn: "count" });

    const frame = statLayerFrame({
      binding: b,
      table,
      n: 2,
      x: { numeric: new Float64Array([0, 1]) },
      y: { column: "density", fallback: density },
      groups: [0, 0],
      inputGroups: [0],
      columns: { density, count },
      columnOf: nullColumnOf,
      lineage: "none",
    });

    expect(Array.from(frame.yNumeric!)).toEqual([10, 20]);
  });

  it("spreads style and after_stat color columns from computed series", () => {
    const count = new Float64Array([1, 3, 5]);
    const b = binding({
      colorStat: "count",
      sizeStat: "count",
    });
    const carried = (_field: string | null) => ["a", "b", "c"] as const;

    const frame = statLayerFrame({
      binding: b,
      table,
      n: 3,
      x: { numeric: new Float64Array([0, 1, 2]) },
      y: { column: "count", fallback: count },
      groups: [0, 0, 0],
      inputGroups: [0],
      columns: { count },
      columnOf: carried,
      lineage: "none",
    });

    expect(Array.from(frame.colorValues as number[])).toEqual([1, 3, 5]);
    expect(Array.from(frame.sizeValues as Float64Array)).toEqual([1, 3, 5]);
  });

  it("uses explicit lineage row indices when provided", () => {
    const lineage = new Uint32Array([4, 7, 9]);
    const frame = statLayerFrame({
      binding: binding({}),
      table,
      n: 3,
      x: { numeric: new Float64Array([0, 1, 2]) },
      y: { numeric: new Float64Array([0, 0, 0]) },
      groups: [0, 0, 0],
      inputGroups: [0],
      columnOf: nullColumnOf,
      lineage,
    });
    expect(frame.rowIndex).toBe(lineage);
    expect(Array.from(frame.rowIndex)).toEqual([4, 7, 9]);
  });

  it("applies extras over emptyFrameExtras", () => {
    const ymin = new Float64Array([0, 0]);
    const ymax = new Float64Array([1, 2]);
    const frame = statLayerFrame({
      binding: binding({}),
      table,
      n: 2,
      x: { values: ["a", "b"], numeric: null },
      y: { numeric: null, values: null },
      groups: [0, 1],
      inputGroups: [0, 1],
      columnOf: nullColumnOf,
      lineage: "none",
      extras: {
        ymin,
        ymax,
        box: {
          lower: new Float64Array([0.2, 0.3]),
          middle: new Float64Array([0.5, 0.6]),
          upper: new Float64Array([0.8, 0.9]),
          outlierX: [],
          outlierY: new Float64Array(0),
          outlierBox: new Uint32Array(0),
          outlierRow: new Uint32Array(0),
        },
      },
    });
    expect(frame.xValues).toEqual(["a", "b"]);
    expect(frame.xNumeric).toBeNull();
    expect(frame.ymin).toBe(ymin);
    expect(frame.ymax).toBe(ymax);
    expect(frame.box?.middle[0]).toBe(0.5);
  });

  it("resolves labelValues through columnOf", () => {
    const labels = ["p1", "p2"];
    const frame = statLayerFrame({
      binding: binding({ labelField: "lab" }),
      table,
      n: 2,
      x: { numeric: new Float64Array([0, 1]) },
      y: { numeric: new Float64Array([0, 1]) },
      groups: [0, 0],
      inputGroups: [0],
      columnOf: (field) => (field === "lab" ? labels : null),
      lineage: "none",
    });
    expect(frame.labelValues).toEqual(labels);
  });
});

/**
 * Per-adapter smoke: converted builders produce frames whose n, groups, and
 * rowIndex match the kernel contract they wrap (#1077 coverage gap).
 */
describe("converted frame-stats adapters smoke (#1077)", () => {
  it("buildEcdfFrame: n matches kernel x, NO_ROW lineage", async () => {
    const { buildEcdfFrame } = await import("../../src/pipeline/frame-stats-ecdf.ts");
    const { AUTO_POSITION_CONVERSION } = await import("../../src/pipeline/temporal-position.ts");
    const data = ColumnTable.fromRows([{ x: 1 }, { x: 2 }, { x: 2 }, { x: 3 }]);
    const groups = [0, 0, 0, 0];
    const b = fromPartial<LayerBinding>({
      layer: { geom: "line", stat: "ecdf", aes: { x: { field: "x" } }, params: { pad: false } },
      index: 0,
      xField: "x",
      yField: null,
      yStatColumn: "ecdf",
      xConversion: AUTO_POSITION_CONVERSION,
      yConversion: AUTO_POSITION_CONVERSION,
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: emptyStyle,
      linewidth: emptyStyle,
      alpha: emptyStyle,
      shape: emptyStyle,
      linetype: emptyStyle,
      labelField: null,
      weightField: null,
    });
    const warnings: { code: string; message: string }[] = [];
    const frame = buildEcdfFrame(b, data, groups, warnings);
    expect(frame.n).toBe(frame.xNumeric!.length);
    expect(frame.n).toBe(frame.groups.length);
    expect(frame.inputGroups).toEqual(groups);
    expect(frame.inputSourceRows).toBeNull();
    expect(frame.rowIndex.every((r) => r === NO_ROW)).toBe(true);
    expect(frame.yNumeric).not.toBeNull();
    expect(frame.yNumeric!.length).toBe(frame.n);
  });

  it("buildDensityFrame: n/groups aligned and area baseline set", async () => {
    const { buildDensityFrame } = await import("../../src/pipeline/frame-stats-density.ts");
    const { AUTO_POSITION_CONVERSION } = await import("../../src/pipeline/temporal-position.ts");
    const data = ColumnTable.fromRows(
      Array.from({ length: 40 }, (_, i) => ({ x: Math.sin(i) + i * 0.1 })),
    );
    const groups = Array.from({ length: data.rowCount }, () => 0);
    const b = fromPartial<LayerBinding>({
      layer: { geom: "density", aes: { x: { field: "x" } } },
      index: 0,
      xField: "x",
      yField: null,
      yStatColumn: "density",
      xConversion: AUTO_POSITION_CONVERSION,
      yConversion: AUTO_POSITION_CONVERSION,
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: emptyStyle,
      linewidth: emptyStyle,
      alpha: emptyStyle,
      shape: emptyStyle,
      linetype: emptyStyle,
      labelField: null,
      weightField: null,
    });
    const frame = buildDensityFrame(b, data, groups, []);
    expect(frame.n).toBe(frame.xNumeric!.length);
    expect(frame.n).toBe(frame.groups.length);
    expect(frame.rowIndex.every((r) => r === NO_ROW)).toBe(true);
    expect(frame.ymin).not.toBeNull();
    expect(frame.ymax).toBe(frame.yNumeric);
  });

  it("packBinLayerFrame: n/groups/rowIndex contract", async () => {
    const { packBinLayerFrame } = await import("../../src/pipeline/frame-stats-bin-frame.ts");
    const { makeColumnOf } = await import("../../src/pipeline/frame-stats-shared.ts");
    const { AUTO_POSITION_CONVERSION } = await import("../../src/pipeline/temporal-position.ts");
    const data = ColumnTable.fromRows([{ x: 1 }, { x: 2 }]);
    const b = fromPartial<LayerBinding>({
      layer: { geom: "bar", stat: "bin", aes: { x: { field: "x" } } },
      index: 0,
      xField: "x",
      yField: null,
      yStatColumn: "count",
      xConversion: AUTO_POSITION_CONVERSION,
      yConversion: AUTO_POSITION_CONVERSION,
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: emptyStyle,
      linewidth: emptyStyle,
      alpha: emptyStyle,
      shape: emptyStyle,
      linetype: emptyStyle,
      labelField: null,
      weightField: null,
    });
    const n = 3;
    const result = {
      x: new Float64Array([0.5, 1.5, 2.5]),
      count: new Float64Array([1, 2, 1]),
      density: new Float64Array([0.1, 0.2, 0.1]),
      ncount: new Float64Array([0.5, 1, 0.5]),
      ndensity: new Float64Array([0.5, 1, 0.5]),
      groups: [0, 0, 0],
      xmin: new Float64Array([0, 1, 2]),
      xmax: new Float64Array([1, 2, 3]),
      carried: {},
      cut: { fuzzy: [0, 1, 2, 3], rightClosed: true, binIndex: new Int32Array([0, 1, 2]) },
    };
    const inputGroups = [0, 0];
    const frame = packBinLayerFrame(b, data, result, makeColumnOf(b), inputGroups);
    expect(frame.n).toBe(n);
    expect(frame.groups).toEqual(result.groups);
    expect(frame.inputGroups).toEqual(inputGroups);
    expect(frame.rowIndex.every((r) => r === NO_ROW)).toBe(true);
    expect(Array.from(frame.yNumeric!)).toEqual([1, 2, 1]);
    expect(frame.binCut).toEqual(result.cut);
  });
});
