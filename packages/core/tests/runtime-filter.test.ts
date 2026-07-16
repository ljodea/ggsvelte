import { describe, expect, test } from "bun:test";

import {
  compileRuntimeRowFilter,
  runtimeFilterValueEqual,
  type RuntimeRowFilterClause,
} from "../src/runtime-filter.ts";

describe("runtime legend row filtering", () => {
  test("exclude clauses hide only their typed raw values", () => {
    const filter = compileRuntimeRowFilter([
      {
        scale: "color",
        field: "group",
        mode: "exclude",
        values: ["1", -0, new Date("2025-01-01T00:00:00.000Z")],
      },
    ]);

    expect(filter({ group: "1" })).toBe(false);
    expect(filter({ group: 1 })).toBe(true);
    expect(filter({ group: -0 })).toBe(false);
    expect(filter({ group: 0 })).toBe(true);
    expect(filter({ group: new Date("2025-01-01T00:00:00.000Z") })).toBe(false);
  });

  test("include clauses retain only listed values and clauses compose with AND", () => {
    const clauses: RuntimeRowFilterClause[] = [
      { scale: "color", field: "group", mode: "include", values: ["west", "east"] },
      { scale: "fill", field: "kind", mode: "exclude", values: ["forecast"] },
    ];
    const filter = compileRuntimeRowFilter(clauses);

    expect(filter({ group: "west", kind: "actual" })).toBe(true);
    expect(filter({ group: "west", kind: "forecast" })).toBe(false);
    expect(filter({ group: "north", kind: "actual" })).toBe(false);
  });

  test("empty clauses are identity and NaN remains a stable filter value", () => {
    expect(compileRuntimeRowFilter([])({ group: "anything" })).toBe(true);
    expect(runtimeFilterValueEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(runtimeFilterValueEqual(null, null)).toBe(true);
    expect(runtimeFilterValueEqual(0, -0)).toBe(false);
  });

  test("compiled filters snapshot mutable caller values", () => {
    const values: (string | number)[] = ["hidden"];
    const filter = compileRuntimeRowFilter([
      { scale: "color", field: "group", mode: "exclude", values },
    ]);
    values.push("later");

    expect(filter({ group: "hidden" })).toBe(false);
    expect(filter({ group: "later" })).toBe(true);
  });
});
