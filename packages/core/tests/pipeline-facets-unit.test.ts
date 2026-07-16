/**
 * Characterization tests for the facet partition module.
 * Exercises resolveFacet / SINGLE_PANEL directly so the extraction stays
 * pinned to ggplot2 panel order and free-scale contracts.
 */
import { describe, expect, it } from "bun:test";

import { PipelineError } from "../src/pipeline.ts";
import { resolveFacet, SINGLE_PANEL } from "../src/pipeline/facets.ts";
import { assertFacetForm, facetFreeFlags } from "../src/pipeline/facets-form.ts";
import { ColumnTable } from "../src/table.ts";

const table = ColumnTable.fromRows([
  { g: "b", r: "y", c: "1", x: 1 },
  { g: "a", r: "y", c: "2", x: 2 },
  { g: "c", r: "x", c: "1", x: 3 },
  { g: "a", r: "x", c: "2", x: 4 },
]);

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
