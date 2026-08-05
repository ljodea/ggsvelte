/**
 * Lean table-coerce path: inferFieldType without Temporal runtime, plus
 * cellsToQuantitative edge cases. ColumnTable has its own lite parsed() path;
 * this locks the public free helpers used by hosts that import them directly.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { installTemporal } from "../src/install-temporal.ts";
import { cellsToQuantitative, inferFieldType, nonTemporalFieldType } from "../src/table-coerce.ts";
import { getTemporalRuntime, resetTemporalRuntimeForTests } from "../src/temporal-runtime.ts";

describe("inferFieldType lean path (no temporal runtime)", () => {
  beforeAll(() => {
    resetTemporalRuntimeForTests();
    expect(getTemporalRuntime()).toBeNull();
  });

  afterAll(() => {
    installTemporal();
    expect(getTemporalRuntime()).not.toBeNull();
  });

  it("classifies all-ISO string columns as temporal", () => {
    expect(inferFieldType(["2024-01-01", "2024-01-02", null])).toBe("temporal");
  });

  it("classifies pure Date columns as temporal", () => {
    expect(
      inferFieldType([new Date("2024-01-01T00:00:00Z"), new Date("2024-01-02T00:00:00Z")]),
    ).toBe("temporal");
  });

  it("rejects mixed ISO strings and numbers as nominal", () => {
    expect(inferFieldType(["2024-01-01", 5, "2024-01-03"])).toBe("nominal");
  });

  it("rejects mixed Dates and numbers as nominal", () => {
    expect(inferFieldType([new Date("2024-01-01T00:00:00Z"), 1_704_067_200_000])).toBe("nominal");
  });

  it("classifies non-ISO labels and booleans as nominal", () => {
    expect(inferFieldType(["s0", "s1", null, "s2"])).toBe("nominal");
    expect(inferFieldType([true, false])).toBe("nominal");
  });

  it("classifies pure numbers as quantitative", () => {
    expect(inferFieldType([1, 2.5, null, 4])).toBe("quantitative");
    expect(inferFieldType([])).toBe("quantitative");
  });

  it("returns nominal for unknown object cells", () => {
    expect(inferFieldType([{ x: 1 } as unknown as never])).toBe("nominal");
  });

  it("matches nonTemporalFieldType when the lean scan is non-temporal", () => {
    const labels = ["a", "b", "a"] as const;
    expect(inferFieldType([...labels])).toBe(nonTemporalFieldType([...labels]));
    const nums = [0, 1, 2] as const;
    expect(inferFieldType([...nums])).toBe(nonTemporalFieldType([...nums]));
  });
});

describe("cellsToQuantitative", () => {
  it("keeps numbers, epoch-ms for Dates, and parses non-empty numeric strings", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    const out = cellsToQuantitative([1, date, "2.5", "  ", null, true]);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(date.getTime());
    expect(out[2]).toBe(2.5);
    expect(Number.isNaN(out[3]!)).toBe(true);
    expect(Number.isNaN(out[4]!)).toBe(true);
    // booleans are not quantitative under the strict coercer
    expect(Number.isNaN(out[5]!)).toBe(true);
  });
});
