/**
 * collectAxisInputs evidence collection.
 */
import { describe, expect, it } from "bun:test";

import { collectAxisInputs } from "../../src/pipeline/scale-training.ts";
import { ColumnTable } from "../../src/table.ts";
import type { Advisory, LayerBinding, LayerFrame } from "../../src/pipeline/types.ts";
import { emptyExtras } from "./fixtures.ts";

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
      xminField: null,
      xmaxField: null,
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
      inputGroups: [0, 1],
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
      xminField: null,
      xmaxField: null,
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
      inputGroups: [0, 0, 0],
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
