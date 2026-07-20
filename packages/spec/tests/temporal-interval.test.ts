import { describe, expect, it } from "bun:test";

import {
  MAX_TEMPORAL_MAJOR_TICKS,
  MAX_TEMPORAL_MINOR_TICKS,
  parseTemporalInterval,
  temporalIntervalTicks,
  temporalLocaleConfigurationError,
} from "../src/index.ts";

describe("temporal interval grammar", () => {
  it("canonicalizes positive integer calendar intervals", () => {
    expect(parseTemporalInterval(" 2 weeks ")).toEqual({
      unit: "week",
      step: 2,
      key: "2 weeks",
    });
    expect(parseTemporalInterval("1 quarter")).toEqual({
      unit: "quarter",
      step: 1,
      key: "1 quarter",
    });
    expect(parseTemporalInterval("500 milliseconds")).toEqual({
      unit: "millisecond",
      step: 500,
      key: "500 milliseconds",
    });
    expect(parseTemporalInterval("1000000 years")).toEqual({
      unit: "year",
      step: 1_000_000,
      key: "1000000 years",
    });
  });

  it("rejects ambiguous, fractional, unbounded, and non-canonical intervals", () => {
    for (const value of [
      "0 days",
      "-1 day",
      "1.5 days",
      "1000001 years",
      "1 ms",
      "1 sec",
      "1 fortnight",
      "day",
      "",
      "1\u00A0day",
      "\u00A01 day",
      "1 day\u00A0",
    ]) {
      expect(() => parseTemporalInterval(value), value).toThrow();
    }
  });
});

describe("temporal interval stepping", () => {
  it("aligns month, quarter, and leap-day ranges to civil boundaries", () => {
    const min = Date.UTC(2023, 11, 15);
    const max = Date.UTC(2024, 6, 2);

    expect(
      temporalIntervalTicks(min, max, "1 quarter", {
        kind: "date",
        timezone: "UTC",
        weekStart: "monday",
      }),
    ).toEqual([Date.UTC(2024, 0, 1), Date.UTC(2024, 3, 1), Date.UTC(2024, 6, 1)]);

    expect(
      temporalIntervalTicks(Date.UTC(2024, 0, 30), Date.UTC(2024, 2, 2), "1 month", {
        kind: "date",
      }),
    ).toEqual([Date.UTC(2024, 1, 1), Date.UTC(2024, 2, 1)]);
  });

  it("anchors multi-year month intervals identically across UTC and zoned datetimes", () => {
    const min = Date.parse("2020-08-15T12:00:00Z");
    const max = Date.parse("2025-08-15T12:00:00Z");
    const yearMonth = (value: number, timeZone: string) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
      }).formatToParts(value);
      return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
    };
    for (const interval of ["18 months", "5 quarters"]) {
      const utc = temporalIntervalTicks(min, max, interval, {
        kind: "datetime",
        timezone: "UTC",
      });
      const zoned = temporalIntervalTicks(min, max, interval, {
        kind: "datetime",
        timezone: "America/New_York",
      });
      expect(
        zoned.map((value) => yearMonth(value, "America/New_York")),
        interval,
      ).toEqual(utc.map((value) => yearMonth(value, "UTC")));
    }
  });

  it("keeps zoned multi-day and multi-week phases aligned with UTC civil dates", () => {
    const civilDates = (
      timezone: string,
      interval: "2 days" | "2 weeks",
      weekStart: "monday" | "sunday" = "monday",
    ) =>
      temporalIntervalTicks(
        Date.parse("2024-01-03T12:00:00-05:00"),
        Date.parse("2024-02-20T12:00:00-05:00"),
        interval,
        { kind: "datetime", timezone, weekStart },
      ).map((value) => {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(value);
        return ["year", "month", "day"]
          .map((type) => parts.find((part) => part.type === type)?.value)
          .join("-");
      });

    expect(civilDates("America/New_York", "2 days").slice(0, 3)).toEqual([
      "2024-01-04",
      "2024-01-06",
      "2024-01-08",
    ]);
    expect(civilDates("America/New_York", "2 days")).toEqual(civilDates("UTC", "2 days"));
    expect(civilDates("America/New_York", "2 weeks", "sunday")).toEqual(
      civilDates("UTC", "2 weeks", "sunday"),
    );
  });

  it("honors named week starts", () => {
    const min = Date.UTC(2026, 0, 1);
    const max = Date.UTC(2026, 0, 20);
    const sunday = temporalIntervalTicks(min, max, "1 week", {
      kind: "date",
      weekStart: "sunday",
    });
    expect(sunday.map((value) => new Date(value).getUTCDay())).toEqual([0, 0, 0]);
  });

  it("steps zoned datetimes monotonically across DST gaps and folds", () => {
    const ranges = [
      {
        min: Date.parse("2024-03-10T00:00:00-05:00"),
        max: Date.parse("2024-03-10T06:00:00-04:00"),
        interval: "1 hour",
      },
      {
        min: Date.parse("2024-03-10T03:30:00-04:00"),
        max: Date.parse("2024-03-10T08:00:00-04:00"),
        interval: "2 hours",
      },
      {
        min: Date.parse("2024-11-03T01:30:00-04:00"),
        max: Date.parse("2024-11-03T07:00:00-05:00"),
        interval: "1 hour",
      },
    ] as const;
    for (const disambiguation of ["compatible", "earlier", "later", "reject"] as const) {
      for (const { min, max, interval } of ranges) {
        const ticks = temporalIntervalTicks(min, max, interval, {
          kind: "datetime",
          timezone: "America/New_York",
          disambiguation,
        });
        expect(ticks.length).toBeGreaterThanOrEqual(2);
        for (let index = 1; index < ticks.length; index++) {
          expect(ticks[index]!).toBeGreaterThan(ticks[index - 1]!);
        }
        expect(new Set(ticks).size).toBe(ticks.length);
      }
    }

    const civilTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const evenHourTicks = temporalIntervalTicks(
      Date.parse("2024-03-10T03:30:00-04:00"),
      Date.parse("2024-03-10T08:00:00-04:00"),
      "2 hours",
      { kind: "datetime", timezone: "America/New_York" },
    );
    expect(evenHourTicks.map((value) => civilTime.format(value))).toEqual([
      "04:00",
      "06:00",
      "08:00",
    ]);
  });

  it("rejects structurally valid locales that the host Intl cannot format", () => {
    expect(temporalLocaleConfigurationError("zz-ZZ")).toContain("unsupported");
    expect(temporalLocaleConfigurationError("en-US")).toBeNull();
  });

  it("fails before allocating an unbounded explicit interval", () => {
    expect(MAX_TEMPORAL_MAJOR_TICKS).toBe(64);
    expect(MAX_TEMPORAL_MINOR_TICKS).toBe(256);
    expect(() =>
      temporalIntervalTicks(Date.UTC(1900, 0, 1), Date.UTC(2025, 0, 1), "1 day", {
        kind: "date",
      }),
    ).toThrow(/64|limit/i);
  });
});
