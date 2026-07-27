import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";

import type { GeometryBatch, RenderModel } from "@ggsvelte/core";

import {
  A11Y_TABLE_CAP,
  a11yMarkCount,
  a11yRows,
  collectCanvasRowIndexes,
} from "../../src/lib/a11y/canvas-a11y.js";

function batch(partial: { layerIndex: number; rowIndex: number[] }): GeometryBatch {
  return fromAny<GeometryBatch>({
    layerIndex: partial.layerIndex,
    geom: "point",
    rowIndex: new Uint32Array(partial.rowIndex),
  });
}

function model(opts: {
  layerFields: Record<number, { field: string }[]>;
  rows: Record<number, Record<string, unknown> | null>;
}): RenderModel {
  return fromAny<RenderModel>({
    layerFields: opts.layerFields,
    row: (index: number) => opts.rows[index] ?? null,
  });
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

  it("collectCanvasRowIndexes / a11yMarkCount share sentinel + dedupe semantics with a11yRows.total", () => {
    const indices = [7, 0xffffffff, 3, 7, 1, 0xffffffff, 3];
    const batches = [batch({ layerIndex: 0, rowIndex: indices })];
    const set = collectCanvasRowIndexes(batches);
    expect(set.size).toBe(3);
    expect(set.has(1)).toBe(true);
    expect(set.has(3)).toBe(true);
    expect(set.has(7)).toBe(true);
    expect(a11yMarkCount(batches)).toBe(3);
    const m = model({
      layerFields: { 0: [{ field: "x" }] },
      rows: { 1: { x: 1 }, 3: { x: 3 }, 7: { x: 7 } },
    });
    expect(a11yRows(m, batches).total).toBe(3);
  });

  it("materialises first CAP rows by ascending index even when batch indexes are shuffled", () => {
    const rows: Record<number, Record<string, unknown>> = {};
    const n = A11Y_TABLE_CAP + 40;
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      rows[i] = { x: i };
      indices.push(i);
    }
    // Fisher–Yates-ish reverse + mid swap so order is not ascending.
    indices.reverse();
    const mid = Math.floor(indices.length / 2);
    const head = indices[0] ?? 0;
    const midVal = indices[mid] ?? 0;
    indices[0] = midVal;
    indices[mid] = head;
    const sample = indices[3] ?? 0;
    indices.push(0xffffffff, sample, 0xffffffff);

    const m = model({
      layerFields: { 0: [{ field: "x" }] },
      rows,
    });
    const table = a11yRows(m, [batch({ layerIndex: 0, rowIndex: indices })]);
    expect(table.total).toBe(n);
    expect(table.rows).toHaveLength(A11Y_TABLE_CAP);
    expect(table.rows[0]).toEqual([0]);
    expect(table.rows[A11Y_TABLE_CAP - 1]).toEqual([A11Y_TABLE_CAP - 1]);
  });

  it("skips null rows among the smallest indexes and continues until CAP successes", () => {
    const rows: Record<number, Record<string, unknown> | null> = {};
    // Smallest indexes 0..4 are null; valid rows start at 5.
    for (let i = 0; i < 5; i++) rows[i] = null;
    for (let i = 5; i < A11Y_TABLE_CAP + 10; i++) rows[i] = { x: i };
    const indices = Object.keys(rows).map(Number);
    indices.reverse();
    const m = model({
      layerFields: { 0: [{ field: "x" }] },
      rows,
    });
    const table = a11yRows(m, [batch({ layerIndex: 0, rowIndex: indices })]);
    expect(table.total).toBe(A11Y_TABLE_CAP + 10);
    expect(table.rows).toHaveLength(A11Y_TABLE_CAP);
    expect(table.rows[0]).toEqual([5]);
    expect(table.rows[A11Y_TABLE_CAP - 1]).toEqual([A11Y_TABLE_CAP + 4]);
  });

  it("a11yMarkCount never calls model.row", () => {
    const row = vi.fn(() => ({ x: 1 }));
    const m = fromAny<RenderModel>({
      layerFields: { 0: [{ field: "x" }] },
      row,
    });
    const batches = [batch({ layerIndex: 0, rowIndex: [0, 1, 2, 0xffffffff, 1] })];
    expect(a11yMarkCount(batches)).toBe(3);
    expect(row).not.toHaveBeenCalled();
    // materialize still works with the same batches
    void m;
  });

  it("does not fully sort all distinct indexes when R ≫ CAP (issue #979)", () => {
    // Pre-fix: [...rowSet].toSorted walks O(R log R). CAP-sized selection must
    // not sort an array longer than a small multiple of CAP.
    const R = A11Y_TABLE_CAP * 40;
    const rows: Record<number, Record<string, unknown>> = {};
    const indices: number[] = [];
    for (let i = 0; i < R; i++) {
      // Scatter indexes so the set is large and unsorted in insertion order.
      const index = (i * 17 + 3) % (R * 3);
      rows[index] = { x: index };
      indices.push(index);
    }
    const m = model({
      layerFields: { 0: [{ field: "x" }] },
      rows,
    });

    let largeSorts = 0;
    const noteLength = (length: number) => {
      if (length > A11Y_TABLE_CAP * 2) largeSorts++;
    };
    const originalSort = Array.prototype.sort;
    const originalToSorted = Array.prototype.toSorted;
    const sortSpy = vi.spyOn(Array.prototype, "sort").mockImplementation(function (
      this: unknown[],
      compareFn?: (a: unknown, b: unknown) => number,
    ) {
      noteLength(this.length);
      return originalSort.call(
        this,
        compareFn as ((a: unknown, b: unknown) => number) | undefined,
      ) as unknown as typeof this;
    });
    const toSortedSpy = vi.spyOn(Array.prototype, "toSorted").mockImplementation(function (
      this: unknown[],
      compareFn?: (a: unknown, b: unknown) => number,
    ) {
      noteLength(this.length);
      return originalToSorted.call(
        this,
        compareFn as ((a: unknown, b: unknown) => number) | undefined,
      );
    });

    try {
      const table = a11yRows(m, [batch({ layerIndex: 0, rowIndex: indices })]);
      expect(table.total).toBe(new Set(indices).size);
      expect(table.rows).toHaveLength(A11Y_TABLE_CAP);
      // Ascending source-row order among materialised CAP rows.
      const xs = table.rows.map((r) => r[0] as number);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
      }
      expect(largeSorts).toBe(0);
    } finally {
      sortSpy.mockRestore();
      toSortedSpy.mockRestore();
    }
  });
});
