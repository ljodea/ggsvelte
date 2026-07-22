import { describe, expect, it } from "bun:test";

import {
  canonicalTemporalParserKey,
  inferTemporalColumn,
  parseTemporal,
  parseTemporalColumn,
  parseTemporalFormat,
  temporalParserConfigurationError,
  TemporalParseError,
  ymd,
  dmy,
  yq,
  fromEpochSeconds,
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
    const tooLong = { format: "x".repeat(129) } as const;

    for (const parser of [unsupported, duplicate, tooLong] as const) {
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

describe("value-driven temporal inference", () => {
  it("infers string years but keeps numeric years quantitative/non-temporal", () => {
    const years = inferTemporalColumn(["1835", "1900", null, "2026"]);
    expect(years).toMatchObject({
      status: "temporal",
      parser: "year",
      precision: "year",
      validatedCount: 3,
    });
    expect(inferTemporalColumn([1835, 1900, 2026])).toMatchObject({ status: "nominal" });
    expect(inferTemporalColumn([1835, "1900", "2026"])).toMatchObject({ status: "nominal" });
  });

  it("infers ISO, year-month, month-year, and year-quarter families", () => {
    expect(inferTemporalColumn(["2024-01-01", "2024-02-03"])).toMatchObject({
      status: "temporal",
      parser: "iso",
    });
    expect(inferTemporalColumn(["2024-01", "2024-02"])).toMatchObject({
      status: "temporal",
      parser: "ym",
    });
    expect(inferTemporalColumn(["01-2024", "02-2024"])).toMatchObject({
      status: "temporal",
      parser: "my",
    });
    expect(inferTemporalColumn(["2024-Q1", "2024-Q4"])).toMatchObject({
      status: "temporal",
      parser: "yq",
    });
  });

  it("does not guess ambiguous date orders or two-digit years", () => {
    const ambiguous = inferTemporalColumn(["03/04/2024", "05/06/2024"]);
    expect(ambiguous.status).toBe("ambiguous");
    expect(ambiguous.candidates).toContain("mdy");
    expect(ambiguous.candidates).toContain("dmy");
    expect(inferTemporalColumn(["03/04/24", "05/06/24"])).toMatchObject({ status: "nominal" });
  });

  it("uses bounded head/tail classification then validates the whole column", () => {
    const values = Array.from({ length: 100 }, (_, index) => `${1900 + index}`);
    values[50] = "not-a-year";
    const decision = inferTemporalColumn(values);
    expect(decision).toMatchObject({ status: "invalid", failedCount: 1, validatedCount: 99 });
    expect(decision.failures?.[0]?.value).toBe("not-a-year");
  });

  it("reports the finest precision independent of row order", () => {
    const coarseFirst = inferTemporalColumn(["2024-01-01", "2024-01-02T12:30:45"]);
    const fineFirst = inferTemporalColumn(["2024-01-02T12:30:45", "2024-01-01"]);
    expect(coarseFirst.precision).toBe("second");
    expect(fineFirst.precision).toBe("second");
    expect(
      parseTemporalColumn(["2024-01-01", "2024-01-02T12:30:45"], "iso").decision.precision,
    ).toBe("second");
  });

  it("accepts Date plus compatible ISO values and rejects incoherent mixtures", () => {
    expect(inferTemporalColumn([new Date("2024-01-01T00:00:00Z"), "2024-01-02"])).toMatchObject({
      status: "temporal",
      parser: "iso",
    });
    expect(inferTemporalColumn([new Date("2024-01-01T00:00:00Z"), "hello"])).toMatchObject({
      status: "nominal",
    });
    expect(inferTemporalColumn([new Date("2024-01-01T00:00:00Z"), "2025"])).toMatchObject({
      status: "nominal",
    });
  });
});

describe("temporal authoring helpers and parser identity", () => {
  it("returns Dates for scalar and array helpers", () => {
    expect(ymd("2024-02-29")).toBeInstanceOf(Date);
    expect(dmy(["31/12/2024", "01/01/2025"])).toHaveLength(2);
    expect(yq("2024-Q2").toISOString()).toStartWith("2024-04-01T00:00:00.000Z");
    expect(fromEpochSeconds(1_700_000_000).getTime()).toBe(1_700_000_000_000);
    expect(() => ymd("2024-02-30")).toThrow(TemporalParseError);
  });

  it("canonicalizes semantic parser identities", () => {
    expect(canonicalTemporalParserKey("dmy")).toBe("name:dmy");
    expect(canonicalTemporalParserKey({ epoch: "seconds" })).toBe("epoch:seconds");
    expect(canonicalTemporalParserKey({ format: "%Y-%m-%d" })).toBe(
      canonicalTemporalParserKey({ format: "%Y-%m-%d" }),
    );
  });
});
