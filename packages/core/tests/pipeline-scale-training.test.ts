/**
 * Characterization tests for axis/color scale training extracted from the pipeline.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import {
  collectAxisInputs,
  isBarLike,
  resolveColorScale,
  trainAxis,
} from "../src/pipeline/scale-training.ts";
import { runPipeline } from "../src/pipeline.ts";
import { EDITION_DEFAULTS } from "../src/editions.ts";
import { ColumnTable } from "../src/table.ts";
import type { LayerBinding, LayerFrame, PipelineWarning, Advisory } from "../src/pipeline/types.ts";

const size = { width: 640, height: 400 };

function emptyExtras(): Pick<
  LayerFrame,
  | "ymin"
  | "ymax"
  | "xmin"
  | "xmax"
  | "dodgeSlot"
  | "dodgeSlotCounts"
  | "offsetX"
  | "offsetY"
  | "box"
  | "smoothBand"
  | "xIntercepts"
  | "yIntercepts"
> {
  return {
    ymin: null,
    ymax: null,
    xmin: null,
    xmax: null,
    dodgeSlot: null,
    dodgeSlotCounts: null,
    offsetX: null,
    offsetY: null,
    box: null,
    smoothBand: false,
    xIntercepts: [],
    yIntercepts: [],
  };
}

function pointFrame(table: ColumnTable): LayerFrame {
  const binding: LayerBinding = {
    layer: { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
    index: 0,
    xField: "x",
    yField: "y",
    yStatColumn: null,
    yminField: null,
    ymaxField: null,
    color: { field: null, constant: null, scaledConstant: null },
    fill: { field: null, constant: null, scaledConstant: null },
    labelField: null,
    labelConstant: null,
    weightField: null,
    ruleForm: null,
  };
  return {
    binding,
    table,
    n: table.rowCount,
    xValues: null,
    xNumeric: table.numeric("x"),
    yNumeric: table.numeric("y"),
    groups: Array.from({ length: table.rowCount }, () => 0),
    rowIndex: Uint32Array.from({ length: table.rowCount }, (_, i) => i),
    colorValues: null,
    fillValues: null,
    labelValues: null,
    ...emptyExtras(),
  };
}

describe("isBarLike", () => {
  it("recognizes bar/col/area only", () => {
    expect(isBarLike("bar")).toBe(true);
    expect(isBarLike("col")).toBe(true);
    expect(isBarLike("area")).toBe(true);
    expect(isBarLike("point")).toBe(false);
    expect(isBarLike("line")).toBe(false);
  });
});

describe("trainAxis", () => {
  it("infers linear for continuous point evidence", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const advisories: Advisory[] = [];
    const inputs = collectAxisInputs("x", [pointFrame(table)], undefined, advisories);
    const training = trainAxis("x", inputs, {});
    expect(training.scale.type).toBe("linear");
    expect(training.advisories.some((a) => a.code === "scale-type-inferred")).toBe(true);
  });

  it("honors explicit scale type without type-inferred advisory", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const inputs = collectAxisInputs("x", [pointFrame(table)], "linear", []);
    const training = trainAxis("x", inputs, { type: "linear" });
    expect(training.scale.type).toBe("linear");
    expect(training.advisories.some((a) => a.code === "scale-type-inferred")).toBe(false);
  });

  it("rejects invalid continuous domains with structured errors", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const inputs = collectAxisInputs("x", [pointFrame(table)], "linear", []);
    try {
      trainAxis("x", inputs, { type: "linear", domain: [1] as unknown as [number, number] });
      expect.unreachable("should throw");
    } catch (e) {
      expect((e as { code: string }).code).toBe("invalid-scale-domain");
    }
  });
});

describe("resolveColorScale", () => {
  it("returns null resolution when no color/fill mapping exists", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const result = resolveColorScale(
      "color",
      [pointFrame(table)],
      table,
      undefined,
      null,
      "color",
      warnings,
      advisories,
      EDITION_DEFAULTS[2] ?? EDITION_DEFAULTS[1]!,
    );
    expect(result.resolved).toBeNull();
    expect(result.legendInput).toBeNull();
  });

  it("trains an ordinal color scale for discrete fields", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10, g: "a" },
      { x: 2, y: 20, g: "b" },
    ]);
    const frame = pointFrame(table);
    frame.binding.color.field = "g";
    frame.colorValues = table.column("g");
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const edition = Object.values(EDITION_DEFAULTS)[0]!;
    const result = resolveColorScale(
      "color",
      [frame],
      table,
      undefined,
      null,
      "g",
      warnings,
      advisories,
      edition,
    );
    expect(result.resolved?.kind).toBe("ordinal");
    expect(result.legendInput?.kind).toBe("discrete");
    expect(advisories.some((a) => a.code === "palette-inferred")).toBe(true);
  });

  it("trains a sequential color scale for continuous fields", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10, z: 0.1 },
      { x: 2, y: 20, z: 0.9 },
    ]);
    const frame = pointFrame(table);
    frame.binding.color.field = "z";
    frame.colorValues = table.column("z");
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const edition = Object.values(EDITION_DEFAULTS)[0]!;
    const result = resolveColorScale(
      "color",
      [frame],
      table,
      undefined,
      null,
      "z",
      warnings,
      advisories,
      edition,
    );
    expect(result.resolved?.kind).toBe("sequential");
    expect(result.legendInput?.kind).toBe("ramp");
    expect(result.state).toBeNull();
    expect(advisories.some((a) => a.code === "palette-inferred")).toBe(true);
  });

  it("honors explicit ordinal type over continuous field inference", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10, z: 1 },
      { x: 2, y: 20, z: 2 },
    ]);
    const frame = pointFrame(table);
    frame.binding.color.field = "z";
    frame.colorValues = table.column("z");
    const edition = Object.values(EDITION_DEFAULTS)[0]!;
    const result = resolveColorScale(
      "color",
      [frame],
      table,
      { type: "ordinal" },
      null,
      "z",
      [],
      [],
      edition,
    );
    expect(result.resolved?.kind).toBe("ordinal");
    expect(result.legendInput?.kind).toBe("discrete");
  });
});

describe("collectAxisInputs — evidence collection", () => {
  it("marks bar measure on y for bar-like geoms", () => {
    const table = ColumnTable.fromRows([
      { g: "a", y: 1 },
      { g: "b", y: 2 },
    ]);
    const binding: LayerBinding = {
      layer: { geom: "col", aes: { x: { field: "g" }, y: { field: "y" } } },
      index: 0,
      xField: "g",
      yField: "y",
      yStatColumn: null,
      yminField: null,
      ymaxField: null,
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      labelField: null,
      labelConstant: null,
      weightField: null,
      ruleForm: null,
    };
    const frame: LayerFrame = {
      binding,
      table,
      n: 2,
      xValues: table.column("g"),
      xNumeric: null,
      yNumeric: table.numeric("y"),
      groups: [0, 1],
      rowIndex: new Uint32Array([0, 1]),
      colorValues: null,
      fillValues: null,
      labelValues: null,
      ...emptyExtras(),
    };
    const advisories: Advisory[] = [];
    const yIn = collectAxisInputs("y", [frame], undefined, advisories);
    expect(yIn.barMeasure).toBe(true);
    expect(yIn.anyDiscrete).toBe(false);
  });

  it("unions bin edges into continuous x evidence", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
    const binding: LayerBinding = {
      layer: { geom: "bar", aes: { x: { field: "x" }, y: { stat: "count" } }, stat: "bin" },
      index: 0,
      xField: "x",
      yField: null,
      yStatColumn: "count",
      yminField: null,
      ymaxField: null,
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      labelField: null,
      labelConstant: null,
      weightField: null,
      ruleForm: null,
    };
    const frame: LayerFrame = {
      binding,
      table,
      n: 2,
      xValues: null,
      xNumeric: null,
      yNumeric: Float64Array.of(1, 1),
      groups: [0, 0],
      rowIndex: new Uint32Array([0xffffffff, 0xffffffff]),
      colorValues: null,
      fillValues: null,
      labelValues: null,
      ...emptyExtras(),
      xmin: Float64Array.of(0, 2),
      xmax: Float64Array.of(2, 4),
    };
    const xIn = collectAxisInputs("x", [frame], undefined, []);
    expect(xIn.numeric.length).toBeGreaterThanOrEqual(2);
    expect(xIn.anyDiscrete).toBe(false);
  });
});

describe("scale training via runPipeline (regression anchors)", () => {
  it("emits scale-type advisories for inferred continuous axes", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    const codes = model.advisories.map((a) => a.code);
    expect(codes).toContain("scale-type-inferred");
  });

  it("forces zero on bar measure axes with advisory", () => {
    const model = runPipeline(
      gg(
        [
          { g: "a", n: 3 },
          { g: "b", n: 5 },
        ],
        aes({ x: "g", y: "n" }),
      )
        .geomCol()
        .spec(),
      size,
    );
    expect(model.advisories.some((a) => a.code === "zero-forced")).toBe(true);
    if (model.scales.y.type !== "band") {
      expect(model.scales.y.domain[0]).toBe(0);
    }
  });
});
