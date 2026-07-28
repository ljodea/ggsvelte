/**
 * Portable temporal interval string grammar (parseTemporalInterval).
 * Tick stepping: temporal-interval-ticks.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { parseTemporalInterval, temporalLabelConfigurationError } from "../src/index.ts";

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

describe("month-day label tokens", () => {
  // The rule: a token is legal on a month-day axis if and only if the month and
  // the day determine it. Everything else would be reporting the reference
  // year's properties as though they belonged to the data.
  it("accepts the tokens month and day actually determine", () => {
    for (const pattern of ["%b %e", "%B %d", "%m-%d", "Q%q", "%b %e (%%)"]) {
      expect(temporalLabelConfigurationError(pattern, "monthDay"), pattern).toBeNull();
    }
  });

  it("rejects year tokens, because there is no year to show", () => {
    for (const pattern of ["%Y-%m-%d", "%b %e %Y", "%y"]) {
      expect(temporalLabelConfigurationError(pattern, "monthDay"), pattern).toContain("monthDay");
    }
  });

  it("rejects clock and zone tokens, which would all print the same zero", () => {
    for (const pattern of ["%H:%M", "%I %p", "%S", "%L", "%z", "%Z"]) {
      expect(temporalLabelConfigurationError(pattern, "monthDay"), pattern).not.toBeNull();
    }
  });

  it("rejects weekday tokens, which describe the reference year and not the data", () => {
    // 1 April fell on a different weekday in 812 than in 2001. Printing one
    // would be inventing a fact.
    for (const pattern of ["%a %e %b", "%A"]) {
      expect(temporalLabelConfigurationError(pattern, "monthDay"), pattern).not.toBeNull();
    }
  });

  it("leaves every other kind alone", () => {
    expect(temporalLabelConfigurationError("%Y-%m-%d", "date")).toBeNull();
    expect(temporalLabelConfigurationError("%H:%M:%S", "time")).toBeNull();
    expect(temporalLabelConfigurationError("%Y-%m-%d %H:%M %Z", "datetime")).toBeNull();
    // Omitting the kind stays permissive, so existing callers do not change.
    expect(temporalLabelConfigurationError("%Y-%m-%d")).toBeNull();
  });
});
