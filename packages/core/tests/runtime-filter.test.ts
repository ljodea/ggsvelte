import { describe, expect, test } from "bun:test";

import {
  compileRuntimeRowIndexFilter,
  type RuntimeRowFilterClause,
} from "../src/runtime-filter.ts";
import type { CellValue } from "../src/table.ts";

/** Build a columnar filter from row-shaped fixtures (test helper only). */
function filterRows(
  clauses: readonly RuntimeRowFilterClause[],
  rows: readonly Readonly<Record<string, CellValue>>[],
): readonly Readonly<Record<string, CellValue>>[] {
  const fields = new Set<string>();
  for (const clause of clauses) fields.add(clause.field);
  const columns = new Map<string, CellValue[]>();
  for (const field of fields) {
    columns.set(
      field,
      rows.map((row) => (Object.hasOwn(row, field) ? row[field]! : null)),
    );
  }
  const filter = compileRuntimeRowIndexFilter(clauses, (field) => columns.get(field) ?? []);
  return rows.filter((_, index) => filter(index));
}

describe("runtime legend row filtering", () => {
  test("exclude clauses hide only their typed raw values", () => {
    const rows = [
      { group: "1" },
      { group: 1 },
      { group: -0 },
      { group: 0 },
      { group: new Date("2025-01-01T00:00:00.000Z") },
    ];
    const kept = filterRows(
      [
        {
          scale: "color",
          field: "group",
          mode: "exclude",
          values: ["1", -0, new Date("2025-01-01T00:00:00.000Z")],
        },
      ],
      rows,
    );

    expect(kept).toEqual([{ group: 1 }, { group: 0 }]);
  });

  test("include clauses retain only listed values and clauses compose with AND", () => {
    const clauses: RuntimeRowFilterClause[] = [
      { scale: "color", field: "group", mode: "include", values: ["west", "east"] },
      { scale: "fill", field: "kind", mode: "exclude", values: ["forecast"] },
    ];
    const rows = [
      { group: "west", kind: "actual" },
      { group: "west", kind: "forecast" },
      { group: "north", kind: "actual" },
    ];

    expect(filterRows(clauses, rows)).toEqual([{ group: "west", kind: "actual" }]);
  });

  test("empty clauses are identity and NaN remains a stable filter value", () => {
    expect(compileRuntimeRowIndexFilter([], () => [])(0)).toBe(true);
    // encodeKey tokens: NaN ≡ NaN; ±0 distinct (not Object.is)
    const filter = compileRuntimeRowIndexFilter(
      [{ scale: "color", field: "group", mode: "exclude", values: [Number.NaN] }],
      () => [Number.NaN, 0, -0],
    );
    expect(filter(0)).toBe(false);
    expect(filter(1)).toBe(true);
    expect(filter(2)).toBe(true);
  });

  test("compiled filters snapshot mutable caller values", () => {
    const values: (string | number)[] = ["hidden"];
    const filter = compileRuntimeRowIndexFilter(
      [{ scale: "color", field: "group", mode: "exclude", values }],
      () => ["hidden", "later"],
    );
    values.push("later");

    expect(filter(0)).toBe(false);
    expect(filter(1)).toBe(true);
  });

  test("columnar filters resolve only required fields once without row allocation", () => {
    const requested: string[] = [];
    const columns = {
      group: ["west", "east", "west"],
      kind: ["actual", "forecast", "actual"],
      unused: [1, 2, 3],
    } as const;
    const filter = compileRuntimeRowIndexFilter(
      [
        { scale: "color", field: "group", mode: "include", values: ["west"] },
        { scale: "fill", field: "kind", mode: "exclude", values: ["forecast"] },
        { scale: "color", field: "group", mode: "exclude", values: ["gone"] },
      ],
      (field) => {
        requested.push(field);
        return columns[field as keyof typeof columns];
      },
    );

    expect([0, 1, 2].filter((index) => filter(index))).toEqual([0, 2]);
    expect(requested).toEqual(["group", "kind"]);
    expect(requested).not.toContain("unused");
  });

  test("keeps undefined distinct from null in columnar filters", () => {
    const clauses: RuntimeRowFilterClause[] = [
      { scale: "color", field: "group", mode: "exclude", values: [undefined] },
    ];
    const rows = [{ group: undefined }, { group: null }];
    expect(filterRows(clauses, rows)).toEqual([{ group: null }]);

    const indexed = compileRuntimeRowIndexFilter(clauses, () => [undefined, null]);
    expect([0, 1].filter((index) => indexed(index))).toEqual([1]);
  });
});
