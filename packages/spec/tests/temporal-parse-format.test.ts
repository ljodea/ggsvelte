/**
 * Exact-format temporal parsing characterization (compile cache, config errors).
 * Production: temporal-parse-format.ts via parseTemporal / temporalParserConfigurationError.
 * Other named engines: temporal-parse.test.ts.
 */
import { describe, expect, it } from "bun:test";

import {
  parseTemporal,
  parseTemporalColumn,
  parseTemporalFormat,
  temporalParserConfigurationError,
} from "../src/temporal.ts";

describe("exact-format temporal parsing", () => {
  it("rejects unsupported or unsafe exact formats", () => {
    expect(parseTemporal("2024", { format: "%s" })).toMatchObject({ ok: false });
    expect(parseTemporal("2024-12", { format: "%Y-%Y" })).toMatchObject({ ok: false });
    expect(parseTemporal("2024", { format: "x".repeat(129) })).toMatchObject({ ok: false });
  });

  /**
   * Characterization for compile-once exact-format parsing (#424): column,
   * scalar, helper, and config-error entry points must keep identical
   * success/failure semantics when the same format is reused many times.
   */
  it("keeps exact-format column decisions identical to per-cell parseTemporal", () => {
    const format = { format: "%d|%m|%Y" } as const;
    const values = ["31|12|2024", "01|01|2025", "not-a-date", "15|06|2023"];
    const column = parseTemporalColumn(values, format);
    expect(column.decision.status).toBe("invalid");
    expect(column.decision.failedCount).toBe(1);
    expect(column.decision.validatedCount).toBe(3);
    for (let index = 0; index < values.length; index++) {
      const cell = parseTemporal(values[index]!, format);
      if (cell.ok) {
        expect(column.valid[index]).toBe(1);
        expect(column.semantic[index]).toBe(cell.epochMs);
      } else {
        expect(column.valid[index]).toBe(0);
        expect(Number.isNaN(column.semantic[index]!)).toBe(true);
      }
    }
  });

  it("reuses exact-format success and failure reasons across repeated scalar calls", () => {
    const format = { format: "%Y-%m-%d %H:%M" } as const;
    const good = "2024-07-04 13:45";
    const bad = "2024/07/04 13:45";
    const firstGood = parseTemporal(good, format);
    const secondGood = parseTemporal(good, format);
    expect(firstGood).toEqual(secondGood);
    expect(firstGood).toMatchObject({ ok: true, kind: "datetime", precision: "minute" });

    const firstBad = parseTemporal(bad, format);
    const secondBad = parseTemporal(bad, format);
    expect(firstBad).toEqual(secondBad);
    expect(firstBad).toMatchObject({ ok: false });

    // Helper array path shares the same compiled format surface.
    const dates: Date[] = parseTemporalFormat([good, good], format.format);
    expect(dates).toHaveLength(2);
    const firstMs = dates[0]!.getTime();
    const secondMs = dates[1]!.getTime();
    expect(firstMs).toBe(secondMs);
    if (firstGood.ok) expect(firstMs).toBe(firstGood.epochMs);
  });

  it("keeps compile-time format configuration errors stable across repeated checks", () => {
    const unsupported = { format: "%s" } as const;
    const duplicate = { format: "%Y-%Y" } as const;

    for (const parser of [unsupported, duplicate] as const) {
      const first = temporalParserConfigurationError(parser);
      const second = temporalParserConfigurationError(parser);
      expect(first).not.toBeNull();
      expect(second).toBe(first);
    }

    expect(temporalParserConfigurationError({ format: "ends-with-%" })).toBe(
      temporalParserConfigurationError({ format: "ends-with-%" }),
    );
    expect(temporalParserConfigurationError({ format: "ends-with-%" })).not.toBeNull();

    // Post-match semantic rules (%Y required) are value-driven, not pure config
    // sampling failures only when the sample also lacks %Y.
    expect(temporalParserConfigurationError({ format: "%m-%d" })).not.toBeNull();
    expect(parseTemporal("12-31", { format: "%m-%d" })).toMatchObject({ ok: false });
    expect(parseTemporal("12-31", { format: "%m-%d" })).toEqual(
      parseTemporal("12-31", { format: "%m-%d" }),
    );
  });

  /**
   * #451: empty and oversize formats must fail without retaining the full
   * user string as a cache key (only 1..128 char formats enter the Map).
   */
  it("rejects empty and oversize exact formats with a stable length reason", () => {
    const lengthReason = "format length must be from 1 through 128 characters";
    const empty = parseTemporal("2024", { format: "" });
    const emptyAgain = parseTemporal("2024", { format: "" });
    expect(empty).toMatchObject({ ok: false, reason: lengthReason });
    expect(emptyAgain).toEqual(empty);
    expect(temporalParserConfigurationError({ format: "" })).toBe(lengthReason);

    // Distinct oversize strings must each fail the same way without relying on
    // cache identity (they must not be stored as Map keys).
    const hugeA = "a".repeat(200);
    const hugeB = "b".repeat(10_000);
    const firstA = parseTemporal("x", { format: hugeA });
    const secondA = parseTemporal("x", { format: hugeA });
    const firstB = parseTemporal("x", { format: hugeB });
    expect(firstA).toMatchObject({ ok: false, reason: lengthReason });
    expect(secondA).toEqual(firstA);
    expect(firstB).toMatchObject({ ok: false, reason: lengthReason });
    expect(temporalParserConfigurationError({ format: hugeA })).toBe(lengthReason);
    expect(temporalParserConfigurationError({ format: hugeB })).toBe(lengthReason);

    // In-range formats still compile and can be reused.
    const okFormat = { format: "%Y-%m-%d" } as const;
    const ok = parseTemporal("2024-01-02", okFormat);
    expect(ok).toMatchObject({ ok: true });
    expect(parseTemporal("2024-01-02", okFormat)).toEqual(ok);
  });

  it("agrees parseTemporal and temporalParserConfigurationError on format grammar failures", () => {
    // Incomplete clock (%H without %M) and %m+%q conflict are post-match; config
    // sample includes both %H and %M so config may pass while values fail.
    expect(parseTemporal("2024-01-01 12", { format: "%Y-%m-%d %H" })).toMatchObject({
      ok: false,
    });
    expect(temporalParserConfigurationError({ format: "%Y-%m-%d %H" })).not.toBeNull();

    expect(parseTemporal("2024-Q1", { format: "%Y-%m-Q%q" })).toMatchObject({ ok: false });
    // Sample uses month 01 and quarter 1 → %m+%q conflict on every value and sample.
    expect(temporalParserConfigurationError({ format: "%Y-%m-Q%q" })).not.toBeNull();

    const invalidZone = temporalParserConfigurationError(
      { format: "%Y-%m-%d" },
      { timezone: "Not/A_Zone" },
    );
    expect(invalidZone).not.toBeNull();
    expect(
      parseTemporal("2024-01-01", { format: "%Y-%m-%d" }, { timezone: "Not/A_Zone" }),
    ).toMatchObject({
      ok: false,
      reason: invalidZone,
    });
  });
});
