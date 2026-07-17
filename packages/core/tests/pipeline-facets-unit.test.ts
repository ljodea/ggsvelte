/**
 * Characterization tests for the facet partition module.
 * Exercises resolveFacet / SINGLE_PANEL directly so the extraction stays
 * pinned to ggplot2 panel order and free-scale contracts.
 *
 * Seams under test (issue #183):
 * - partitionByField: single O(n) pass → Map<encodeKey, row indices>
 * - resolveFacet wrap/grid: panel membership + empty-grid parity
 * - complexity: facet-field column() reads stay O(1) in distinct levels
 */
import { describe, expect, it, spyOn } from "bun:test";

import { encodeKey } from "../src/scales/state.ts";
import { PipelineError } from "../src/pipeline.ts";
import { resolveFacet, SINGLE_PANEL } from "../src/pipeline/facets.ts";
import { assertFacetForm, facetFreeFlags } from "../src/pipeline/facets-form.ts";
import { partitionByField } from "../src/pipeline/facets-tokens.ts";
import { ColumnTable } from "../src/table.ts";

const table = ColumnTable.fromRows([
  { g: "b", r: "y", c: "1", x: 1 },
  { g: "a", r: "y", c: "2", x: 2 },
  { g: "c", r: "x", c: "1", x: 3 },
  { g: "a", r: "x", c: "2", x: 4 },
]);

/** Count ColumnTable.column(field) calls during fn (restored after). */
function countColumnReads(field: string, fn: () => void): number {
  let reads = 0;
  const desc = Object.getOwnPropertyDescriptor(ColumnTable.prototype, "column");
  if (desc?.value === undefined) {
    throw new Error("ColumnTable.prototype.column is not a data property");
  }
  const impl = desc.value as (this: ColumnTable, name: string) => readonly unknown[];
  const spy = spyOn(ColumnTable.prototype, "column").mockImplementation(function (
    this: ColumnTable,
    name: string,
  ) {
    if (name === field) reads += 1;
    return impl.call(this, name);
  });
  try {
    fn();
    return reads;
  } finally {
    spy.mockRestore();
  }
}

describe("SINGLE_PANEL", () => {
  it("returns one unfaceted panel with identity sourceRows", () => {
    const layout = SINGLE_PANEL(table);
    expect(layout.faceted).toBe(false);
    expect(layout.panels).toHaveLength(1);
    expect(layout.nrow).toBe(1);
    expect(layout.ncol).toBe(1);
    expect(layout.freeX).toBe(false);
    expect(layout.freeY).toBe(false);
    expect(layout.panels[0]!.sourceRows).toBeNull();
    expect(layout.panels[0]!.table.rowCount).toBe(table.rowCount);
  });
});

describe("resolveFacet — wrap", () => {
  it("orders panels by ascending facet value and near-square wrap", () => {
    const layout = resolveFacet({ wrap: { field: "g" } }, table);
    expect(layout.faceted).toBe(true);
    expect(layout.panels.map((p) => p.label)).toEqual(["a", "b", "c"]);
    // 3 panels -> ncol = ceil(sqrt(3)) = 2
    expect(layout.ncol).toBe(2);
    expect(layout.nrow).toBe(2);
    expect(layout.panels[0]!.row).toBe(0);
    expect(layout.panels[0]!.col).toBe(0);
    expect(layout.panels[1]!.col).toBe(1);
    expect(layout.panels[2]!.row).toBe(1);
  });

  it("partitions rows into panel tables before stats", () => {
    const layout = resolveFacet({ wrap: { field: "g" } }, table);
    const panelA = layout.panels[0]!;
    expect(panelA.table.rowCount).toBe(2);
    expect(panelA.sourceRows).toEqual([1, 3]);
  });

  it("honors free scale flags", () => {
    expect(resolveFacet({ wrap: { field: "g" }, scales: "free" }, table)).toMatchObject({
      freeX: true,
      freeY: true,
    });
    expect(resolveFacet({ wrap: { field: "g" }, scales: "free_x" }, table)).toMatchObject({
      freeX: true,
      freeY: false,
    });
    expect(resolveFacet({ wrap: { field: "g" }, scales: "free_y" }, table)).toMatchObject({
      freeX: false,
      freeY: true,
    });
  });

  it("throws structured unknown-field errors", () => {
    try {
      resolveFacet({ wrap: { field: "missing" } }, table);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("unknown-field");
      expect((e as PipelineError).path).toBe("/facet/wrap");
    }
  });
});

describe("resolveFacet — grid", () => {
  it("builds a rows × cols cartesian panel grid", () => {
    const layout = resolveFacet({ rows: { field: "r" }, cols: { field: "c" } }, table);
    expect(layout.faceted).toBe(true);
    // r: x,y (sorted); c: 1,2 (sorted) → 2×2
    expect(layout.nrow).toBe(2);
    expect(layout.ncol).toBe(2);
    expect(layout.panels).toHaveLength(4);
    // labels combine row/col values
    expect(layout.panels.map((p) => p.label).toSorted()).toEqual(
      ["x / 1", "x / 2", "y / 1", "y / 2"].toSorted(),
    );
  });

  it("keeps empty grid combinations as empty panels with sourceRows", () => {
    const sparse = ColumnTable.fromRows([
      { r: "a", c: "1", x: 1 },
      { r: "b", c: "2", x: 2 },
    ]);
    const layout = resolveFacet({ rows: { field: "r" }, cols: { field: "c" } }, sparse);
    expect(layout.panels).toHaveLength(4);
    const empty = layout.panels.filter((p) => p.table.rowCount === 0);
    expect(empty.length).toBe(2);
    for (const panel of empty) {
      expect(panel.sourceRows).toEqual([]);
    }
  });

  it("rejects mixing wrap with rows/cols", () => {
    try {
      resolveFacet({ wrap: { field: "g" }, rows: { field: "r" } }, table);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("facet-form-ambiguous");
    }
  });

  it("rejects empty facet forms", () => {
    try {
      resolveFacet({}, table);
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("facet-form-missing");
    }
  });
});

describe("facetFreeFlags / assertFacetForm", () => {
  it("derives free_x and free_y from scales modes", () => {
    expect(facetFreeFlags()).toEqual({ freeX: false, freeY: false });
    expect(facetFreeFlags("free")).toEqual({ freeX: true, freeY: true });
    expect(facetFreeFlags("free_x")).toEqual({ freeX: true, freeY: false });
    expect(facetFreeFlags("free_y")).toEqual({ freeX: false, freeY: true });
  });

  it("throws facet-form-ambiguous when wrap mixes with grid fields", () => {
    try {
      assertFacetForm({ wrapField: "g", rowsField: "r", colsField: null });
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("facet-form-ambiguous");
    }
  });
});

describe("partitionByField — single-pass buckets", () => {
  it("groups row indices by encodeKey in table order", () => {
    const t = ColumnTable.fromRows([
      { g: "b", x: 0 },
      { g: "a", x: 1 },
      { g: "b", x: 2 },
      { g: "a", x: 3 },
      { g: null, x: 4 },
      { g: 1, x: 5 },
      { g: "1", x: 6 },
    ]);
    const buckets = partitionByField(t, "g");
    expect(buckets.get(encodeKey("b"))).toEqual([0, 2]);
    expect(buckets.get(encodeKey("a"))).toEqual([1, 3]);
    expect(buckets.get(encodeKey(null))).toEqual([4]);
    // number 1 and string "1" stay distinct panels
    expect(buckets.get(encodeKey(1))).toEqual([5]);
    expect(buckets.get(encodeKey("1"))).toEqual([6]);
    expect(buckets.size).toBe(5);
  });

  it("reads the facet column once", () => {
    const t = ColumnTable.fromRows(
      Array.from({ length: 40 }, (_, i) => ({ g: `v${i % 10}`, x: i })),
    );
    const reads = countColumnReads("g", () => {
      partitionByField(t, "g");
    });
    expect(reads).toBe(1);
  });
});

describe("resolveFacet — O(n) partition (issue #183)", () => {
  it("wrap: column reads stay bounded as distinct levels grow", () => {
    const levels = 40;
    const rows = Array.from({ length: levels * 5 }, (_, i) => ({
      g: `g${i % levels}`,
      x: i,
    }));
    const t = ColumnTable.fromRows(rows);
    const reads = countColumnReads("g", () => {
      resolveFacet({ wrap: { field: "g" } }, t);
    });
    // facetValues + partitionByField (+ optional fieldType via column) — not per level
    expect(reads).toBeLessThanOrEqual(4);
    expect(reads).toBeLessThan(levels);
  });

  it("grid: row/col column reads stay bounded as the cartesian grid grows", () => {
    const R = 12;
    const C = 12;
    const rows = Array.from({ length: R * C }, (_, i) => ({
      r: `r${i % R}`,
      c: `c${Math.floor(i / R) % C}`,
      x: i,
    }));
    const t = ColumnTable.fromRows(rows);
    const rowReads = countColumnReads("r", () => {
      resolveFacet({ rows: { field: "r" }, cols: { field: "c" } }, t);
    });
    const colReads = countColumnReads("c", () => {
      resolveFacet({ rows: { field: "r" }, cols: { field: "c" } }, t);
    });
    // Not one scan per row-level / col-level / cell
    expect(rowReads).toBeLessThanOrEqual(4);
    expect(colReads).toBeLessThanOrEqual(4);
    expect(rowReads).toBeLessThan(R);
    expect(colReads).toBeLessThan(C);
  });

  it("wrap still assigns every source row to exactly one panel", () => {
    const layout = resolveFacet({ wrap: { field: "g" } }, table);
    const assigned = layout.panels.flatMap((p) => p.sourceRows ?? []);
    expect(assigned.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("grid still intersects row/col buckets and keeps empty combos", () => {
    const sparse = ColumnTable.fromRows([
      { r: "a", c: "1", x: 1 },
      { r: "a", c: "1", x: 2 },
      { r: "b", c: "2", x: 3 },
    ]);
    const layout = resolveFacet({ rows: { field: "r" }, cols: { field: "c" } }, sparse);
    expect(layout.panels).toHaveLength(4);
    const byLabel = Object.fromEntries(layout.panels.map((p) => [p.label, p.sourceRows]));
    expect(byLabel["a / 1"]).toEqual([0, 1]);
    expect(byLabel["b / 2"]).toEqual([2]);
    expect(byLabel["a / 2"]).toEqual([]);
    expect(byLabel["b / 1"]).toEqual([]);
  });

  it("grid rows-only partitions by row field in ascending table order", () => {
    const t = ColumnTable.fromRows([
      { r: "b", x: 1 },
      { r: "a", x: 2 },
      { r: "b", x: 3 },
    ]);
    const layout = resolveFacet({ rows: { field: "r" } }, t);
    expect(layout.nrow).toBe(2);
    expect(layout.ncol).toBe(1);
    expect(layout.panels.map((p) => p.label)).toEqual(["a", "b"]);
    expect(layout.panels[0]!.sourceRows).toEqual([1]);
    expect(layout.panels[1]!.sourceRows).toEqual([0, 2]);
  });

  it("grid cols-only partitions by col field in ascending table order", () => {
    const t = ColumnTable.fromRows([
      { c: "2", x: 1 },
      { c: "1", x: 2 },
      { c: "2", x: 3 },
    ]);
    const layout = resolveFacet({ cols: { field: "c" } }, t);
    expect(layout.nrow).toBe(1);
    expect(layout.ncol).toBe(2);
    expect(layout.panels.map((p) => p.label)).toEqual(["1", "2"]);
    expect(layout.panels[0]!.sourceRows).toEqual([1]);
    expect(layout.panels[1]!.sourceRows).toEqual([0, 2]);
  });
});
