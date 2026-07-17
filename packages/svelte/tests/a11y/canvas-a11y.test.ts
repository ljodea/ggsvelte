import { describe, expect, it } from "vitest";

import type { GeometryBatch, RenderModel } from "@ggsvelte/core";

import { A11Y_TABLE_CAP, a11yRows } from "../../src/lib/a11y/canvas-a11y.js";

function batch(partial: { layerIndex: number; rowIndex: number[] }): GeometryBatch {
  return {
    layerIndex: partial.layerIndex,
    geom: "point",
    rowIndex: new Uint32Array(partial.rowIndex),
  } as unknown as GeometryBatch;
}

function model(opts: {
  layerFields: Record<number, { field: string }[]>;
  rows: Record<number, Record<string, unknown> | null>;
}): RenderModel {
  return {
    layerFields: opts.layerFields,
    row: (index: number) => opts.rows[index] ?? null,
  } as unknown as RenderModel;
}

describe("a11yRows", () => {
  it("collects unique fields in first-seen order and sorted row indices", () => {
    const m = model({
      layerFields: {
        0: [{ field: "x" }, { field: "y" }],
        1: [{ field: "y" }, { field: "color" }],
      },
      rows: {
        2: { x: 1, y: 2, color: "a" },
        0: { x: 0, y: 0, color: "b" },
        5: { x: 5, y: 5, color: "c" },
      },
    });
    const table = a11yRows(m, [
      batch({ layerIndex: 0, rowIndex: [2, 0xffffffff, 2] }),
      batch({ layerIndex: 1, rowIndex: [5, 0] }),
    ]);
    expect(table.fields).toEqual(["x", "y", "color"]);
    expect(table.total).toBe(3);
    expect(table.rows).toEqual([
      [0, 0, "b"],
      [1, 2, "a"],
      [5, 5, "c"],
    ]);
  });

  it("skips 0xffffffff sentinels and null rows but counts total pre-filter", () => {
    const m = model({
      layerFields: { 0: [{ field: "x" }] },
      rows: {
        1: { x: 1 },
        3: null,
      },
    });
    const table = a11yRows(m, [batch({ layerIndex: 0, rowIndex: [1, 0xffffffff, 3, 1] })]);
    expect(table.total).toBe(2);
    expect(table.rows).toEqual([[1]]);
  });

  it("maps undefined cell values to null", () => {
    const m = model({
      layerFields: { 0: [{ field: "x" }, { field: "y" }] },
      rows: { 0: { x: 1 } },
    });
    const table = a11yRows(m, [batch({ layerIndex: 0, rowIndex: [0] })]);
    expect(table.rows).toEqual([[1, null]]);
  });

  it(`caps materialised rows at ${String(A11Y_TABLE_CAP)} while reporting full total`, () => {
    const rows: Record<number, Record<string, unknown>> = {};
    const indices: number[] = [];
    for (let i = 0; i < A11Y_TABLE_CAP + 25; i++) {
      rows[i] = { x: i };
      indices.push(i);
    }
    const m = model({
      layerFields: { 0: [{ field: "x" }] },
      rows,
    });
    const table = a11yRows(m, [batch({ layerIndex: 0, rowIndex: indices })]);
    expect(table.total).toBe(A11Y_TABLE_CAP + 25);
    expect(table.rows).toHaveLength(A11Y_TABLE_CAP);
    expect(table.rows[0]).toEqual([0]);
    expect(table.rows[A11Y_TABLE_CAP - 1]).toEqual([A11Y_TABLE_CAP - 1]);
  });
});
