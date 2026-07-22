import { describe, expect, it } from "bun:test";

import { compileTemporalLabelFormat, formatTemporalTickSequence } from "../../src/layout/format.ts";
import { planTemporalAxis } from "../../src/layout/temporal-guide.ts";
import { measurer } from "./fixtures.ts";

describe("temporal label formatting", () => {
  it("formats strict tokens in an explicit locale and IANA timezone", () => {
    const format = compileTemporalLabelFormat("%a %e %b %Y %I:%M %p %Z", {
      kind: "datetime",
      locale: "en-US",
      timezone: "America/New_York",
    });
    expect(format(Date.UTC(2024, 2, 10, 7, 30))).toBe("Sun 10 Mar 2024 03:30 AM EDT");
  });

  it("normalizes accepted UTC aliases before Intl formatting", () => {
    for (const timezone of ["Z", "Etc/UTC"]) {
      const format = compileTemporalLabelFormat("%Y-%m-%d %H:%M %Z", {
        kind: "datetime",
        locale: "en-GB",
        timezone,
      });
      expect(format(Date.UTC(2024, 0, 2, 3, 4)), timezone).toBe("2024-01-02 03:04 UTC");
    }
  });

  it("keeps date-kind labels on UTC calendar fields", () => {
    const format = compileTemporalLabelFormat("%Y-%m-%d", {
      kind: "date",
      locale: "en-US",
      timezone: "Asia/Tokyo",
    });
    expect(format(Date.UTC(2024, 0, 1, 23))).toBe("2024-01-01");
  });

  it("formats historical IANA offsets that include seconds in %z", () => {
    const historical = Date.UTC(1880, 0, 1, 12);
    const kolkata = compileTemporalLabelFormat("%z", {
      kind: "datetime",
      locale: "en-US",
      timezone: "Asia/Kolkata",
    });
    expect(kolkata(historical)).toBe("+0521");
    expect(kolkata(historical)).not.toBe("+0000");
  });

  it("contextualizes reversed temporal labels in visual order", () => {
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(2025, 10, 1), Date.UTC(2026, 1, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 400,
      reverse: true,
      measurer,
      fontSize: 11,
      marginCapPx: 80,
      config: { dateBreaks: "1 month" },
    });
    // Visual leading tick (rightmost domain value under reverse) keeps year context.
    const visualLeading = plan.ticks.at(-1)!;
    expect(visualLeading.label).toMatch(/2026|Feb/);
    expect(visualLeading.label).not.toBe("Feb");
  });

  it("builds contextual visible labels and standalone full labels", () => {
    const values = [
      Date.UTC(2025, 10, 1),
      Date.UTC(2025, 11, 1),
      Date.UTC(2026, 0, 1),
      Date.UTC(2026, 1, 1),
    ];
    const labels = formatTemporalTickSequence(values, {
      kind: "date",
      interval: { unit: "month", step: 1, key: "1 month" },
      locale: "en-US",
      timezone: "UTC",
    });
    expect(labels.map((label) => label.label)).toEqual(["Nov 2025", "Dec", "Jan 2026", "Feb"]);
    expect(labels.map((label) => label.fullLabel)).toEqual([
      "2025-11-01",
      "2025-12-01",
      "2026-01-01",
      "2026-02-01",
    ]);
  });

  it("keeps standalone datetime labels distinct at sub-second precision", () => {
    const values = [Date.UTC(2024, 0, 1, 0, 0, 0, 1), Date.UTC(2024, 0, 1, 0, 0, 0, 2)];
    const milliseconds = formatTemporalTickSequence(values, {
      kind: "datetime",
      interval: { unit: "millisecond", step: 1, key: "1 millisecond" },
      locale: "en-US",
      timezone: "UTC",
    });
    expect(milliseconds.map((label) => label.fullLabel)).toEqual([
      "2024-01-01 00:00:00.001 UTC",
      "2024-01-01 00:00:00.002 UTC",
    ]);

    const retainedPrecision = formatTemporalTickSequence(values, {
      kind: "datetime",
      interval: { unit: "second", step: 1, key: "1 second" },
      locale: "en-US",
      timezone: "UTC",
    });
    expect(retainedPrecision.map((label) => label.fullLabel)).toEqual(
      milliseconds.map((label) => label.fullLabel),
    );

    const wholeSeconds = formatTemporalTickSequence(
      [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1, 0, 0, 1)],
      {
        kind: "datetime",
        interval: { unit: "second", step: 1, key: "1 second" },
        locale: "en-US",
        timezone: "UTC",
      },
    );
    expect(wholeSeconds.map((label) => label.fullLabel)).toEqual([
      "2024-01-01 00:00:00 UTC",
      "2024-01-01 00:00:01 UTC",
    ]);
  });

  it("extracts Gregorian numeric fields with Latin digits in non-Latin locales", () => {
    const format = compileTemporalLabelFormat("%Y-%m-%d %H:%M:%S", {
      kind: "datetime",
      locale: "fa-IR",
      timezone: "UTC",
    });
    expect(format(Date.UTC(2024, 2, 10, 7, 30, 9))).toBe("2024-03-10 07:30:09");
    expect(format(Date.UTC(2024, 2, 10, 7, 30, 9))).not.toContain("NaN");
  });

  it("rejects unsupported strict dateLabels tokens", () => {
    expect(() =>
      compileTemporalLabelFormat("%Y %Q", {
        kind: "date",
        locale: "en-US",
        timezone: "UTC",
      }),
    ).toThrow(/%Q/);
  });
});
