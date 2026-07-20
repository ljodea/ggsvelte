import { describe, expect, it } from "bun:test";

import { ColumnTable, inferFieldType, isISODateString } from "../src/table.ts";

describe("ColumnTable temporal parsed views", () => {
  it("uses shared strict inference for ISO, string years, periods, and ambiguity", () => {
    expect(inferFieldType(["1835", "1900", "2026"])).toBe("temporal");
    expect(inferFieldType([1835, 1900, 2026])).toBe("quantitative");
    expect(inferFieldType(["2024-01", "2024-02"])).toBe("temporal");
    expect(inferFieldType(["2024-Q1", "2024-Q2"])).toBe("temporal");
    expect(inferFieldType(["03/04/2024", "05/06/2024"])).toBe("nominal");
    expect(inferFieldType(["2024-02-30", "2024-03-01"])).toBe("nominal");
    expect(isISODateString("2024-02-29")).toBe(true);
    expect(isISODateString("2024-02-30")).toBe(false);
  });

  it("returns cached auto views with epoch semantics, validity, precision, and raw values", () => {
    const table = ColumnTable.fromColumns({ when: ["1835", null, "2026"] });
    const view = table.parsed("when");
    expect(view).toBe(table.parsed("when"));
    expect(view.raw).toBe(table.column("when"));
    expect(view.parserKey).toContain("auto:year");
    expect(view.temporalKind).toBe("date");
    expect(view.temporalPrecision).toBe("year");
    expect(view.valid).toEqual(Uint8Array.of(1, 0, 1));
    expect(new Date(view.semantic[0]!).toISOString()).toStartWith("1835-01-01");
    expect(new Date(view.semantic[2]!).toISOString()).toStartWith("2026-01-01");
    expect(table.numeric("when")).toBe(view.semantic);
    expect(table.fieldType("when")).toBe("temporal");
  });

  it("keeps option-sensitive auto decisions consistent with field types", () => {
    const table = ColumnTable.fromColumns({ when: ["2024-03-10T02:30:00"] });
    const options = { timezone: "America/New_York" } as const;
    expect(table.parsed("when", "auto", options).decision.status).toBe("nominal");
    expect(table.fieldType("when", "auto", options)).toBe("nominal");
    expect(inferFieldType([new Date("2024-01-01T00:00:00Z"), 1_704_067_200_000])).toBe("nominal");
  });

  it("keys explicit parser views by parser and conversion options", () => {
    const table = ColumnTable.fromColumns({ when: ["03/04/2024", "04/05/2024"] });
    const dmy = table.parsed("when", "dmy");
    const mdy = table.parsed("when", "mdy");
    expect(dmy).not.toBe(mdy);
    expect(dmy.parserKey).not.toBe(mdy.parserKey);
    expect(new Date(dmy.semantic[0]!).getUTCMonth()).toBe(3);
    expect(new Date(mdy.semantic[0]!).getUTCMonth()).toBe(2);
    expect(table.parsed("when", "dmy")).toBe(dmy);
  });

  it("keeps failed explicit rows invalid for caller error/censor policy", () => {
    const table = ColumnTable.fromColumns({ when: ["31/12/2024", "bad"] });
    const view = table.parsed("when", "dmy");
    expect(view.decision.status).toBe("invalid");
    expect(view.decision.failedCount).toBe(1);
    expect(view.valid).toEqual(Uint8Array.of(1, 0));
    expect(Number.isNaN(view.semantic[1]!)).toBe(true);
  });

  it("gathers subset views from the parent decision and preserves all-null facet type", () => {
    const table = ColumnTable.fromColumns({ when: ["2024", null, "2026"] });
    const parent = table.parsed("when");
    const subset = table.subset([1, 2]);
    const child = subset.parsed("when");
    expect(child.decision).toBe(parent.decision);
    expect(child.raw).toEqual([null, "2026"]);
    expect(child.valid).toEqual(Uint8Array.of(0, 1));
    expect(child.semantic[1]).toBe(parent.semantic[2]);
    expect(subset.fieldType("when")).toBe("temporal");

    const allNull = table.subset([1]);
    expect(allNull.fieldType("when")).toBe("temporal");
    expect(allNull.parsed("when").decision).toBe(parent.decision);
  });
});
