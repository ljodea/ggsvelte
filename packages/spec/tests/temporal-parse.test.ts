/**
 * Value-level temporal parsing characterization (packages/spec/src/temporal-parse.ts).
 * Column inference: temporal-column.test.ts. Authoring helpers: temporal-helpers.test.ts.
 */
import { describe, expect, it } from "bun:test";

import {
  parseTemporal,
  parseTemporalColumn,
  parseTemporalFormat,
  temporalParserConfigurationError,
} from "../src/temporal.ts";

describe("strict temporal parsing", () => {
  it("rejects blank strings for explicit epoch parsers", () => {
    for (const value of ["", " ", "\t", "\n"] as const) {
      expect(parseTemporal(value, { epoch: "seconds" })).toMatchObject({ ok: false });
      expect(parseTemporal(value, { epoch: "milliseconds" })).toMatchObject({ ok: false });
    }
  });

  it("accepts Gregorian leap dates and rejects calendar overflow", () => {
    expect(parseTemporal("2000-02-29", "iso")).toMatchObject({
      ok: true,
      kind: "date",
      precision: "date",
    });
    expect(parseTemporal("1900-02-29", "iso")).toMatchObject({ ok: false });
    expect(parseTemporal("2024-02-30", "iso")).toMatchObject({ ok: false });
    expect(parseTemporal("2024-13-01", "iso")).toMatchObject({ ok: false });
  });

  it("parses timezone-less timestamps as UTC and validates offsets", () => {
    const utc = parseTemporal("2024-03-10T01:02:03.456", "iso");
    expect(utc).toMatchObject({ ok: true, kind: "datetime", precision: "millisecond" });
    if (utc.ok) expect(utc.epochMs).toBe(Date.UTC(2024, 2, 10, 1, 2, 3, 456));

    const offset = parseTemporal("2024-03-10T01:02:03+02:30", "iso");
    expect(offset).toMatchObject({ ok: true });
    if (offset.ok) expect(offset.epochMs).toBe(Date.UTC(2024, 2, 9, 22, 32, 3));

    expect(parseTemporal("2024-03-10T01:02:03+24:00", "iso")).toMatchObject({ ok: false });
    expect(parseTemporal("2024-03-10T24:00:00Z", "iso")).toMatchObject({ ok: false });
  });

  it("supports period, ordered-date, timestamp, exact-format, and epoch parsers", () => {
    expect(parseTemporal("2024", "year")).toMatchObject({ ok: true, precision: "year" });
    expect(parseTemporal("2024-07", "ym")).toMatchObject({ ok: true, precision: "month" });
    expect(parseTemporal("07-2024", "my")).toMatchObject({ ok: true, precision: "month" });
    expect(parseTemporal("2024-Q3", "yq")).toMatchObject({ ok: true, precision: "quarter" });
    expect(parseTemporal("31/12/2024", "dmy")).toMatchObject({ ok: true });
    expect(parseTemporal("2024.31.12", "ydm")).toMatchObject({ ok: true });
    expect(parseTemporal("12/31/2024 23:59", "mdy_hm")).toMatchObject({
      ok: true,
      precision: "minute",
    });
    expect(parseTemporal("31/12/2024 23:59:58", "dmy_hms")).toMatchObject({
      ok: true,
      precision: "second",
    });
    expect(parseTemporal("31|12|2024", { format: "%d|%m|%Y" })).toMatchObject({ ok: true });
    expect(parseTemporal("2024-01-01+02:00", { format: "%Y-%m-%d%z" })).toMatchObject({
      ok: true,
      kind: "datetime",
      precision: "date",
      epochMs: Date.UTC(2023, 11, 31, 22),
    });
    expect(parseTemporal(1_700_000_000, { epoch: "seconds" })).toMatchObject({
      ok: true,
      epochMs: 1_700_000_000_000,
    });
    expect(parseTemporal(1_700_000_000_000, { epoch: "milliseconds" })).toMatchObject({
      ok: true,
      epochMs: 1_700_000_000_000,
    });
  });

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

  it("rejects DST gaps/folds by default and supports explicit disambiguation", () => {
    expect(
      parseTemporal("2024-03-10T02:30:00", "iso", {
        timezone: "America/New_York",
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseTemporal("2024-03-10T02:30:00", "iso", {
        timezone: "America/New_York",
        disambiguation: "later",
      }),
    ).toMatchObject({ ok: true, epochMs: Date.parse("2024-03-10T07:30:00.000Z") });
    expect(
      parseTemporal("2024-11-03T01:30:00", "iso", {
        timezone: "America/New_York",
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseTemporal("2024-11-03T01:30:00", "iso", {
        timezone: "America/New_York",
        disambiguation: "earlier",
      }),
    ).toMatchObject({ ok: true, epochMs: Date.parse("2024-11-03T05:30:00.000Z") });
    expect(
      parseTemporal("2024-11-03T01:30:00", "iso", {
        timezone: "America/New_York",
        disambiguation: "later",
      }),
    ).toMatchObject({ ok: true, epochMs: Date.parse("2024-11-03T06:30:00.000Z") });
    expect(parseTemporal("2024-01-01", "iso", { timezone: "Not/A_Zone" })).toMatchObject({
      ok: false,
    });
    expect(parseTemporal("2024-01-01T00:00:00Z", "iso", { timezone: "Not/A_Zone" })).toMatchObject({
      ok: false,
    });
  });

  it("keeps date precision in UTC while applying zones to datetimes", () => {
    const year = parseTemporal("2024", "year", { timezone: "Asia/Tokyo" });
    expect(year).toMatchObject({ ok: true, kind: "date", epochMs: Date.UTC(2024, 0, 1) });
    const datetime = parseTemporal("2024-01-01T00:00:00", "iso", {
      timezone: "Asia/Tokyo",
    });
    expect(datetime).toMatchObject({
      ok: true,
      kind: "datetime",
      epochMs: Date.UTC(2023, 11, 31, 15),
    });
  });

  it("uses timezone options during automatic classification and whole-column parsing", () => {
    const parsed = parseTemporalColumn(["2024-03-10T01:30:00", "2024-03-10T02:30:00"], "auto", {
      timezone: "America/New_York",
      disambiguation: "later",
    });
    expect(parsed.decision).toMatchObject({ status: "temporal", parser: "iso" });
    expect([...parsed.semantic]).toEqual([
      Date.parse("2024-03-10T06:30:00.000Z"),
      Date.parse("2024-03-10T07:30:00.000Z"),
    ]);
  });
});
