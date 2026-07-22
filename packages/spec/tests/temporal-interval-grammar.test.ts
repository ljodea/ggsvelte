/**
 * Portable temporal interval string grammar (parseTemporalInterval).
 * Tick stepping: temporal-interval-ticks.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { parseTemporalInterval } from "../src/index.ts";

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
