import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { resolveStyleScale } from "../../src/pipeline/scale-style.js";
import type { LayerBinding, LayerFrame } from "../../src/pipeline/types.js";
import { ColumnTable } from "../../src/table.js";

describe("resolveStyleScale", () => {
  it("trains binned finite styles from an explicit domain when data is empty", () => {
    // Empty mapped samples (runtime-filtered frame) must still train from an
    // explicit domain — same contract as numeric/color binned scales.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { shape: { field: "value" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: "value", statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 0,
      xNumeric: new Float64Array(0),
      yNumeric: new Float64Array(0),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array(0),
      shapeValues: [],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "shape",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: {
        type: "binned",
        domain: [0, 10],
        breaks: [0, 5, 10],
        range: ["circle", "square"],
      },
      prevState: null,
      title: "shape",
      warnings,
    });
    expect(resolution.guidePlan?.type).toBe("discrete");
    if (resolution.guidePlan?.type !== "discrete") throw new Error("expected discrete guide");
    expect(resolution.guidePlan.domain).toEqual([0, 5]);
  });

  it("trains a temporal sequential style from an explicit domain when all rows are filtered", () => {
    // A runtime filter can empty the frame while an authored temporal domain
    // still fully determines the scale. It must train from that domain instead
    // of throwing style-temporal-parse / style-temporal-kind on zero samples.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { size: { field: "when" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: "when", statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 0,
      xNumeric: new Float64Array(0),
      yNumeric: new Float64Array(0),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array(0),
      sizeValues: [],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "size",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: {
        type: "sequential",
        temporalKind: "date",
        domain: ["2024-01-01", "2024-01-31"],
      },
      prevState: null,
      title: "size",
      warnings,
    });
    expect(resolution.resolved).not.toBeNull();
    expect(resolution.resolved?.scale.domain).toEqual([
      Date.UTC(2024, 0, 1),
      Date.UTC(2024, 0, 31),
    ]);
  });

  it("trains binned finite styles from authored breaks alone when data is empty", () => {
    // Authored breaks fully define the bins and domain, so a runtime-filtered
    // frame must train from them without an explicit domain (previously only
    // `domain` exempted the empty-extent throw).
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { shape: { field: "value" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: "value", statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 0,
      xNumeric: new Float64Array(0),
      yNumeric: new Float64Array(0),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array(0),
      shapeValues: [],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "shape",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: {
        type: "binned",
        breaks: [0, 5, 10],
        range: ["circle", "square"],
      },
      prevState: null,
      title: "shape",
      warnings,
    });
    expect(resolution.guidePlan?.type).toBe("discrete");
    if (resolution.guidePlan?.type !== "discrete") throw new Error("expected discrete guide");
    expect(resolution.guidePlan.domain).toEqual([0, 5]);
  });

  it("trains a temporal binned numeric style from authored breaks when all rows are filtered", () => {
    // The temporal parser seed must fall back to authored breaks (not just an
    // authored domain) so a fully filtered temporal binned scale still resolves
    // instead of throwing style-temporal-parse on zero samples.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { size: { field: "when" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: "when", statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 0,
      xNumeric: new Float64Array(0),
      yNumeric: new Float64Array(0),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array(0),
      sizeValues: [],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "size",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: {
        type: "binned",
        temporalKind: "date",
        breaks: ["2024-01-01", "2024-01-15", "2024-01-31"],
        range: [2, 6],
      },
      prevState: null,
      title: "size",
      warnings,
    });
    expect(resolution.resolved).not.toBeNull();
    expect(resolution.resolved?.scale.domain).toEqual([
      Date.UTC(2024, 0, 1),
      Date.UTC(2024, 0, 31),
    ]);
  });

  it("refuses to invent a sequential temporal domain from guide-tick breaks", () => {
    // Sequential breaks are guide-tick positions, not bin boundaries. When all
    // rows are filtered they must NOT seed the temporal parser (only binned
    // breaks do) — otherwise arbitrary tick choices would silently train the
    // scale extent. With no samples the sequential scale must refuse instead.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { size: { field: "when" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: "when", statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 0,
      xNumeric: new Float64Array(0),
      yNumeric: new Float64Array(0),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array(0),
      sizeValues: [],
    });
    const warnings: { code: string; message: string }[] = [];
    expect(() =>
      resolveStyleScale({
        aesthetic: "size",
        frames: [frame],
        bindings: [binding],
        table,
        sourceTable: table,
        config: {
          type: "sequential",
          temporalKind: "date",
          breaks: ["2024-01-01", "2024-01-15", "2024-01-31"],
        },
        prevState: null,
        title: "size",
        warnings,
      }),
    ).toThrow();
  });

  it("returns a null resolution when no style mapping is present", () => {
    // Collect must report anyField=false so the orchestrator short-circuits
    // without inventing a constant scale.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: {} },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 1,
      xNumeric: new Float64Array([1]),
      yNumeric: new Float64Array([1]),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array([0]),
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "size",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: undefined,
      prevState: null,
      title: "size",
      warnings,
    });
    expect(resolution).toEqual({
      aesthetic: "size",
      resolved: null,
      legendInput: null,
      guidePlan: null,
      state: null,
    });
    expect(warnings).toEqual([]);
  });

  it("trains a discrete style from a scaled constant and keeps its legend interactive", () => {
    // Scaled constants are catalog-backed and indexable — collect must set
    // anyField/anyDiscrete/anyIndexable so ordinal training and hover keys work.
    const table = ColumnTable.fromRows([{ x: 1, y: 1 }]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { shape: { value: "focus", scale: true } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: null, statColumn: null, constant: null, scaledConstant: "focus" },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table,
      n: 1,
      xNumeric: new Float64Array([1]),
      yNumeric: new Float64Array([1]),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array([0]),
      shapeValues: ["focus"],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "shape",
      frames: [frame],
      bindings: [binding],
      table,
      sourceTable: table,
      config: { type: "ordinal" },
      prevState: null,
      title: "shape",
      warnings,
    });
    expect(resolution.resolved?.scale.domain).toEqual(["focus"]);
    expect(resolution.resolved?.scale.valueOf("focus")).toBe("circle");
    expect(resolution.legendInput).not.toBeNull();
    expect(resolution.legendInput?.interactive).not.toBe(false);
    expect(resolution.guidePlan?.type).toBe("discrete");
  });

  it("trains ordinal style domains from the source catalog when the frame is filtered", () => {
    // Runtime filters drop rows from panel frames, but the unfiltered source
    // catalog must still train ordinal domains so legend keys and assignments
    // stay stable across filters (mirrors color ordinal catalog training).
    const sourceTable = ColumnTable.fromRows([
      { x: 1, y: 1, group: "a" },
      { x: 2, y: 2, group: "b" },
      { x: 3, y: 3, group: "c" },
    ]);
    // Filtered frame only sees a + b.
    const filteredTable = ColumnTable.fromRows([
      { x: 1, y: 1, group: "a" },
      { x: 2, y: 2, group: "b" },
    ]);
    const binding = fromAny<LayerBinding>({
      layer: { geom: "point", aes: { shape: { field: "group" } } },
      index: 0,
      xField: "x",
      yField: "y",
      color: { field: null, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      size: { field: null, statColumn: null, constant: null, scaledConstant: null },
      linewidth: { field: null, statColumn: null, constant: null, scaledConstant: null },
      alpha: { field: null, statColumn: null, constant: null, scaledConstant: null },
      shape: { field: "group", statColumn: null, constant: null, scaledConstant: null },
      linetype: { field: null, statColumn: null, constant: null, scaledConstant: null },
      ruleForm: null,
    });
    const frame = fromAny<LayerFrame>({
      binding,
      table: filteredTable,
      n: 2,
      xNumeric: new Float64Array([1, 2]),
      yNumeric: new Float64Array([1, 2]),
      groups: [],
      inputGroups: [],
      rowIndex: new Uint32Array([0, 1]),
      shapeValues: ["a", "b"],
    });
    const warnings: { code: string; message: string }[] = [];
    const resolution = resolveStyleScale({
      aesthetic: "shape",
      frames: [frame],
      bindings: [binding],
      table: filteredTable,
      sourceTable,
      config: { type: "ordinal" },
      prevState: null,
      title: "shape",
      warnings,
    });
    expect(resolution.resolved?.scale.domain).toEqual(["a", "b", "c"]);
    // Filtered-out category still receives a stable palette slot.
    expect(resolution.resolved?.scale.valueOf("c")).toBe("square");
    expect(resolution.guidePlan?.type).toBe("discrete");
    if (resolution.guidePlan?.type !== "discrete") throw new Error("expected discrete guide");
    expect(resolution.guidePlan.domain).toEqual(["a", "b", "c"]);
  });
});
