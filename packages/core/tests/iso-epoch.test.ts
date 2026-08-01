import { describe, expect, it } from "bun:test";

import { isIsoLikeString, isoEpochMs, isoHasClock } from "../src/iso-epoch.ts";

describe("isoEpochMs", () => {
  it("parses date, datetime, fraction, and offset forms to UTC epoch ms", () => {
    expect(isoEpochMs("2024-03-05")).toBe(Date.UTC(2024, 2, 5));
    expect(isoEpochMs("2024-03-05T06:07:08")).toBe(Date.UTC(2024, 2, 5, 6, 7, 8));
    expect(isoEpochMs("2024-03-05 06:07")).toBe(Date.UTC(2024, 2, 5, 6, 7));
    // Fractional seconds truncate to milliseconds.
    expect(isoEpochMs("2024-03-05T06:07:08.123456789")).toBe(Date.UTC(2024, 2, 5, 6, 7, 8, 123));
    expect(isoEpochMs("2024-03-05T06:07:08Z")).toBe(Date.UTC(2024, 2, 5, 6, 7, 8));
    expect(isoEpochMs("2024-03-05T06:07:08+02:00")).toBe(
      Date.UTC(2024, 2, 5, 6, 7, 8) - 2 * 3_600_000,
    );
    expect(isoEpochMs("2024-03-05T06:07:08-0230")).toBe(
      Date.UTC(2024, 2, 5, 6, 7, 8) + 2.5 * 3_600_000,
    );
    // Years 0–99 must not map to 1900+.
    expect(isoEpochMs("0099-01-01")).toBe(new Date(0).setUTCFullYear(99, 0, 1));
  });

  it("rejects out-of-range fields and non-ISO strings", () => {
    expect(isoEpochMs("2024-13-01")).toBeUndefined();
    expect(isoEpochMs("2024-02-30")).toBeUndefined();
    expect(isoEpochMs("2024-03-05T24:00")).toBeUndefined();
    expect(isoEpochMs("2024-03-05T06:60")).toBeUndefined();
    expect(isoEpochMs("2024-03-05T06:07:08+25:00")).toBeUndefined();
    expect(isoEpochMs("not a date")).toBeUndefined();
    expect(isoEpochMs("2024/03/05")).toBeUndefined();
  });
});

describe("isIsoLikeString", () => {
  it("accepts exactly the strings isoEpochMs can parse", () => {
    expect(isIsoLikeString("2024-03-05")).toBe(true);
    expect(isIsoLikeString("2024-03-05T06:07:08.5Z")).toBe(true);
    expect(isIsoLikeString("2024-02-30")).toBe(false); // shape matches, calendar rejects
    expect(isIsoLikeString("not a date")).toBe(false);
  });
});

describe("isoHasClock", () => {
  it("detects a time component with T or space separators", () => {
    expect(isoHasClock("2024-03-05T06:07")).toBe(true);
    expect(isoHasClock("2024-03-05 06:07:08")).toBe(true);
    expect(isoHasClock("2024-03-05")).toBe(false);
  });
});
