import { describe, expect, it } from "bun:test";

import {
  MAX_TEMPORAL_MAJOR_TICKS,
  MAX_TEMPORAL_MINOR_TICKS,
  parseTemporalInterval,
  temporalIntervalTicks,
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
    for (const [min, max] of [
      [Date.parse("2024-03-09T00:00:00-05:00"), Date.parse("2024-03-12T00:00:00-04:00")],
      [Date.parse("2024-11-02T00:00:00-04:00"), Date.parse("2024-11-05T00:00:00-05:00")],
    ] as const) {
      const ticks = temporalIntervalTicks(min, max, "1 day", {
        kind: "datetime",
        timezone: "America/New_York",
        disambiguation: "reject",
      });
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      for (let index = 1; index < ticks.length; index++) {
        expect(ticks[index]!).toBeGreaterThan(ticks[index - 1]!);
      }
      expect(ticks.map((value) => new Date(value).toISOString())).toEqual(
        [...new Set(ticks)].map((value) => new Date(value).toISOString()),
      );
    }
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
