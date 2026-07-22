/**
 * Represented-row lineage filters and column-hoist complexity contracts.
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { countColumnReads } from "./fixtures.ts";
import { ColumnTable } from "../../src/table.ts";

describe("lineage represented-row filters", () => {
  it("keeps rows whose band key matches the aggregate x output", async () => {
    const { filterAggregateXRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const table = ColumnTable.fromRows([
      { g: "a", y: 1 },
      { g: "b", y: 2 },
      { g: "a", y: 3 },
    ]);
    expect(
      filterAggregateXRows({
        table,
        field: "g",
        outputX: "a",
        baseRows: [0, 1, 2],
      }),
    ).toEqual([0, 2]);
  });

  it("filters bin membership with closed=right half-open intervals", async () => {
    const { filterBinRepresentedRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const table = ColumnTable.fromRows([{ x: 0.5 }, { x: 1.5 }, { x: 2.5 }, { x: 3.5 }]);
    const frame = fromAny({
      xmin: new Float64Array([0, 2]),
      xmax: new Float64Array([2, 4]),
      groups: new Uint32Array([0, 0]),
      n: 2,
      binding: { layer: { params: { closed: "right" } } },
    });
    expect(
      filterBinRepresentedRows({
        frame,
        table,
        frameRow: 0,
        field: "x",
        baseRows: [0, 1, 2, 3],
      }),
    ).toEqual([0, 1]);
  });

  it("keeps rows with finite y values for aggregate y lineage", async () => {
    const { filterAggregateYRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const table = ColumnTable.fromRows([
      { y: 1 },
      { y: Number.NaN },
      { y: 3 },
      { y: null },
      { y: Infinity },
    ]);
    expect(
      filterAggregateYRows({
        table,
        field: "y",
        baseRows: [0, 1, 2, 3, 4],
      }),
    ).toEqual([0, 2]);
  });
});

describe("lineage filter column hoist (issue #220)", () => {
  it("filterAggregateXRows reads the field column once for many base rows", async () => {
    const { filterAggregateXRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const table = ColumnTable.fromRows(
      Array.from({ length: 40 }, (_, i) => ({ g: i % 2 === 0 ? "a" : "b", y: i })),
    );
    const baseRows = Array.from({ length: 40 }, (_, i) => i);
    const reads = countColumnReads("g", () => {
      filterAggregateXRows({ table, field: "g", outputX: "a", baseRows });
    });
    expect(reads).toBe(1);
  });

  it("filterBinRepresentedRows reads the field column once for many base rows", async () => {
    const { filterBinRepresentedRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const table = ColumnTable.fromRows(Array.from({ length: 40 }, (_, i) => ({ x: i * 0.1 })));
    const frame = fromAny({
      xmin: new Float64Array([0]),
      xmax: new Float64Array([2]),
      groups: new Uint32Array([0]),
      n: 1,
      binding: { layer: { params: { closed: "right" } } },
    });
    const baseRows = Array.from({ length: 40 }, (_, i) => i);
    const reads = countColumnReads("x", () => {
      filterBinRepresentedRows({
        frame,
        table,
        frameRow: 0,
        field: "x",
        baseRows,
      });
    });
    expect(reads).toBe(1);
  });

  it("filterAggregateYRows reads the field column once for many base rows", async () => {
    const { filterAggregateYRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const table = ColumnTable.fromRows(
      Array.from({ length: 40 }, (_, i) => ({ y: i % 5 === 0 ? Number.NaN : i })),
    );
    const baseRows = Array.from({ length: 40 }, (_, i) => i);
    const reads = countColumnReads("y", () => {
      filterAggregateYRows({ table, field: "y", baseRows });
    });
    expect(reads).toBe(1);
  });
});
