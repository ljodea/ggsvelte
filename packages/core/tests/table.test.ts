import { describe, expect, it } from "bun:test";

import { ColumnTable, inferFieldType, isISODateString } from "../src/table.ts";

describe("ColumnTable construction", () => {
  it("builds from rows (missing keys become null)", () => {
    const t = ColumnTable.fromRows([{ x: 1, y: "a" }, { x: 2 }]);
    expect(t.rowCount).toBe(2);
    expect(t.fields.toSorted()).toEqual(["x", "y"]);
    expect(t.column("y")).toEqual(["a", null]);
  });

  it("builds from columns and rejects ragged input", () => {
    const t = ColumnTable.fromColumns({ x: [1, 2], y: ["a", "b"] });
    expect(t.rowCount).toBe(2);
    expect(() => ColumnTable.fromColumns({ x: [1], y: [1, 2] })).toThrow(/length/);
  });

  it("unknown fields throw with the available names", () => {
    const t = ColumnTable.fromColumns({ x: [1] });
    expect(() => t.column("z")).toThrow(/available: x/);
  });
});

describe("numeric()", () => {
  it("returns a cached Float64Array with documented coercions", () => {
    const d = new Date("2026-01-02T00:00:00Z");
    const t = ColumnTable.fromColumns({
      v: [1.5, null, true, d, "2026-01-02", "not a number"],
    });
    const n = t.numeric("v");
    expect(n).toBeInstanceOf(Float64Array);
    expect(n[0]).toBe(1.5);
    expect(Number.isNaN(n[1]!)).toBe(true); // null
    expect(n[2]).toBe(1); // boolean
    expect(n[3]).toBe(d.getTime()); // Date -> epoch ms
    expect(n[4]).toBe(Date.parse("2026-01-02")); // ISO string -> epoch ms
    expect(Number.isNaN(n[5]!)).toBe(true);
    expect(t.numeric("v")).toBe(n); // cached
  });
});

describe("field type inference", () => {
  it("string -> nominal; boolean -> nominal; number -> quantitative", () => {
    expect(inferFieldType(["a", "b"])).toBe("nominal");
    expect(inferFieldType([true, false])).toBe("nominal");
    expect(inferFieldType([1, 2.5])).toBe("quantitative");
  });

  it("Date and all-ISO-date-string columns -> temporal", () => {
    expect(inferFieldType([new Date(), null])).toBe("temporal");
    expect(inferFieldType(["2026-07-10", "2026-07-11T12:00:00Z"])).toBe("temporal");
  });

  it("mixed columns: any non-ISO string or string+number -> nominal", () => {
    expect(inferFieldType([1, "a"])).toBe("nominal");
    expect(inferFieldType(["2026-07-10", "yesterday"])).toBe("nominal");
    expect(inferFieldType([1, "2026-07-10"])).toBe("nominal");
  });

  it("empty / all-null -> quantitative (no evidence of discreteness)", () => {
    expect(inferFieldType([])).toBe("quantitative");
    expect(inferFieldType([null, null])).toBe("quantitative");
  });

  it("discreteness follows the type", () => {
    const t = ColumnTable.fromColumns({
      cls: ["a", "b"],
      v: [1, 2],
      day: ["2026-07-10", "2026-07-11"],
    });
    expect(t.discreteness("cls")).toBe("discrete");
    expect(t.discreteness("v")).toBe("continuous");
    expect(t.discreteness("day")).toBe("continuous"); // temporal
  });

  it("isISODateString accepts dates and datetimes, rejects lookalikes", () => {
    expect(isISODateString("2026-07-10")).toBe(true);
    expect(isISODateString("2026-07-10T12:34:56.789Z")).toBe(true);
    expect(isISODateString("2026-13-40")).toBe(false); // invalid date
    expect(isISODateString("20260710")).toBe(false);
    expect(isISODateString("hello")).toBe(false);
  });
});
