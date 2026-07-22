/**
 * Time/log ticks and label format strings (M1 scale surface).
 */
import { describe, expect, it } from "bun:test";

import { formatTime, numberFormatter } from "../../src/layout/format.ts";
import { defaultLogTickFormat, logTicks } from "../../src/layout/ticks.ts";
import { defaultTimeTickFormat, timeTicks } from "../../src/layout/time.ts";

describe("time ticks", () => {
  it("year spans tick on year starts with %Y labels", () => {
    const result = timeTicks(Date.UTC(2020, 3, 1), Date.UTC(2026, 8, 1), 7);
    expect(result.unit).toBe("year");
    expect(result.values.map((v) => defaultTimeTickFormat(v))).toEqual([
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
    ]);
  });

  it("month spans tick on month starts (multi-scale labels: year at January)", () => {
    const result = timeTicks(Date.UTC(2025, 10, 15), Date.UTC(2026, 2, 10), 5);
    expect(result.unit).toBe("month");
    expect(result.values.map((v) => defaultTimeTickFormat(v))).toEqual([
      "Dec",
      "2026",
      "Feb",
      "Mar",
    ]);
  });

  it("day spans tick on UTC midnights", () => {
    const result = timeTicks(Date.UTC(2026, 0, 1, 6), Date.UTC(2026, 0, 5, 18), 5);
    expect(result.unit).toBe("day");
    for (const v of result.values) {
      expect(new Date(v).getUTCHours()).toBe(0);
    }
    expect(defaultTimeTickFormat(result.values[0]!)).toBe("Jan 02");
  });

  it("hour/minute spans use aligned fixed intervals with %H:%M labels", () => {
    const result = timeTicks(Date.UTC(2026, 0, 1, 9, 3), Date.UTC(2026, 0, 1, 11, 57), 6);
    expect(result.unit).toBe("minute");
    expect(result.step).toBe(30);
    expect(defaultTimeTickFormat(result.values[0]!)).toBe("09:30");
  });

  it("week spans align to ISO Mondays", () => {
    const result = timeTicks(Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 15), 6);
    expect(result.unit).toBe("week");
    for (const v of result.values) {
      expect(new Date(v).getUTCDay()).toBe(1); // Monday
    }
  });
});

describe("log ticks", () => {
  it("few decades get 1/2/5 mantissas", () => {
    expect(logTicks(1, 100, 6)).toEqual([1, 2, 5, 10, 20, 50, 100]);
  });

  it("many decades fall back to spaced powers of ten", () => {
    const ticks = logTicks(1, 1e12, 5);
    expect(ticks.length).toBeLessThanOrEqual(8);
    for (const t of ticks) {
      expect(Math.log10(t) % 1).toBeCloseTo(0, 9);
    }
  });

  it("formats plain numbers, exponential beyond 1e6", () => {
    expect(defaultLogTickFormat(100)).toBe("100");
    expect(defaultLogTickFormat(0.01)).toBe("0.01");
    expect(defaultLogTickFormat(1e7)).toBe("1e7");
  });
});

describe("label format strings", () => {
  it("numeric formats: d, ,d, .2f, .0%, ~s", () => {
    expect(numberFormatter("d").format(1234.6)).toBe("1235");
    expect(numberFormatter(",d").format(1234567)).toBe("1,234,567");
    expect(numberFormatter(".2f").format(12.3456)).toBe("12.35");
    expect(numberFormatter(".0%").format(0.421)).toBe("42%");
    expect(numberFormatter("~s").format(1500)).toBe("1.5k");
    expect(numberFormatter("~s").format(0.002)).toBe("2m");
  });

  it("unknown formats report ok: false (fallback, never throw)", () => {
    const f = numberFormatter("bogus");
    expect(f.ok).toBe(false);
    expect(f.format(3)).toBe("3");
  });

  it("time formats: strftime subset over UTC", () => {
    const ms = Date.UTC(2026, 6, 9, 14, 5, 7);
    expect(formatTime(ms, "%Y-%m-%d")).toBe("2026-07-09");
    expect(formatTime(ms, "%b %e, %Y")).toBe("Jul 9, 2026");
    expect(formatTime(ms, "%H:%M:%S")).toBe("14:05:07");
    expect(formatTime(ms, "100%%")).toBe("100%");
  });
});
