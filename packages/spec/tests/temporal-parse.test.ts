/**
 * Value-level temporal parsing characterization (named engines + dispatcher).
 * Exact format: temporal-parse-format.test.ts.
 * Column inference: temporal-column.test.ts. Authoring helpers: temporal-helpers.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { parseTemporal, parseTemporalColumn } from "../src/temporal.ts";

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

  describe("md — month-day without a year", () => {
    // The reference year is 2000 because it is a leap year: Feb 29 has to be
    // representable, and partsToEpoch rejects it in any other year.
    const REFERENCE_YEAR = 2000;

    it("resolves a bare month-day into the reference year", () => {
      expect(parseTemporal("04-05", "md")).toMatchObject({
        ok: true,
        kind: "date",
        precision: "date",
        epochMs: Date.UTC(REFERENCE_YEAR, 3, 5),
      });
    });

    it("accepts the ISO recurring-date spelling and slash separators", () => {
      for (const value of ["--04-05", "04/05", "4-5"] as const) {
        expect(parseTemporal(value, "md")).toMatchObject({
          ok: true,
          epochMs: Date.UTC(REFERENCE_YEAR, 3, 5),
        });
      }
    });

    it("takes the month and day from a full date and discards the year", () => {
      // The whole point of the kind: two observations 1189 years apart that
      // fell on the same calendar day must land on the same instant. The old
      // reference-year column projected day-of-year instead, so 0812-04-01
      // (a leap year) came out as 2 April.
      const ancient = parseTemporal("0812-04-01", "md");
      const modern = parseTemporal("2001-04-01", "md");
      expect(ancient).toMatchObject({ ok: true, epochMs: Date.UTC(REFERENCE_YEAR, 3, 1) });
      expect(modern).toMatchObject({ ok: true, epochMs: Date.UTC(REFERENCE_YEAR, 3, 1) });
    });

    it("keeps 29 February, which is why the reference year is a leap year", () => {
      expect(parseTemporal("02-29", "md")).toMatchObject({
        ok: true,
        epochMs: Date.UTC(REFERENCE_YEAR, 1, 29),
      });
      expect(parseTemporal("1812-02-29", "md")).toMatchObject({
        ok: true,
        epochMs: Date.UTC(REFERENCE_YEAR, 1, 29),
      });
    });

    it("rejects calendar overflow and anything carrying a time", () => {
      for (const value of ["13-01", "02-30", "00-10", "04-00", "04-05T12:00", "2024"] as const) {
        expect(parseTemporal(value, "md")).toMatchObject({ ok: false });
      }
    });
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
