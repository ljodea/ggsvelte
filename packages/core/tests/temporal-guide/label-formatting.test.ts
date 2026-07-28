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

  it("keeps reversed month labels span-uniform with year on every tick (#962)", () => {
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
    const labels = plan.ticks.map((tick) => tick.label);
    expect(labels.every((label) => /^\w+ \d{4}$/.test(label))).toBe(true);
  });

  it("builds span-uniform visible labels and standalone full labels (#962)", () => {
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
    expect(labels.map((label) => label.label)).toEqual([
      "Nov 2025",
      "Dec 2025",
      "Jan 2026",
      "Feb 2026",
    ]);
    expect(labels.map((label) => label.fullLabel)).toEqual([
      "2025-11-01",
      "2025-12-01",
      "2026-01-01",
      "2026-02-01",
    ]);
  });

  it("never mixes full dates with bare day numbers on day intervals (#962)", () => {
    const values = [
      Date.UTC(2001, 2, 26),
      Date.UTC(2001, 3, 9),
      Date.UTC(2001, 3, 16),
      Date.UTC(2001, 3, 23),
    ];
    const labels = formatTemporalTickSequence(values, {
      kind: "date",
      interval: { unit: "day", step: 1, key: "1 day" },
      locale: "en-US",
      timezone: "UTC",
    });
    expect(labels.map((label) => label.label)).toEqual(["Mar 26", "Apr 9", "Apr 16", "Apr 23"]);
    expect(labels.every((label) => !/^\d+$/.test(label.label))).toBe(true);
  });

  it("uses one hour format across a multi-day datetime sequence (#962)", () => {
    const values = [
      Date.UTC(2024, 2, 10, 14, 0),
      Date.UTC(2024, 2, 10, 18, 0),
      Date.UTC(2024, 2, 11, 2, 0),
    ];
    const labels = formatTemporalTickSequence(values, {
      kind: "datetime",
      interval: { unit: "hour", step: 4, key: "4 hours" },
      locale: "en-US",
      timezone: "UTC",
    });
    expect(labels.map((label) => label.label)).toEqual([
      "Mar 10 14:00",
      "Mar 10 18:00",
      "Mar 11 02:00",
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

describe("month-day labels", () => {
  const REF = 2000;
  const options = { kind: "monthDay", locale: "en-US", timezone: "UTC" } as const;
  const day = { unit: "day", step: 1, key: "1 day" } as const;

  it("names the day without a year", () => {
    const labels = formatTemporalTickSequence(
      [Date.UTC(REF, 3, 5), Date.UTC(REF, 3, 15), Date.UTC(REF, 3, 25)],
      { ...options, interval: day },
    );
    expect(labels.map((label) => label.label)).toEqual(["Apr 5", "Apr 15", "Apr 25"]);
  });

  it("keeps the year out of the full label too", () => {
    // fullLabel is not the visible tick, so a leak here is easy to miss — it
    // reaches the guide plan and anything reading it. The datetime default
    // would render "2000-04-05 00:00:00 UTC", exposing the reference year the
    // whole kind exists to hide.
    const [label] = formatTemporalTickSequence([Date.UTC(REF, 3, 5)], {
      ...options,
      interval: day,
    });
    expect(label!.fullLabel).not.toContain("2000");
    expect(label!.fullLabel).toBe("Apr 5");
  });

  it("never emits a bare year, whatever interval it is handed", () => {
    // A year interval is the fallback when an author gives fewer than two
    // explicit breaks, so it is reachable without anyone asking for it.
    for (const unit of ["year", "quarter", "month", "week", "day"] as const) {
      const [label] = formatTemporalTickSequence([Date.UTC(REF, 3, 5)], {
        ...options,
        interval: { unit, step: 1, key: `1 ${unit}` },
      });
      expect(label!.label, unit).not.toBe(String(REF));
      expect(label!.label, unit).not.toContain("2000");
    }
  });

  it("still names the month and the quarter, which stand alone without a year", () => {
    const month = formatTemporalTickSequence([Date.UTC(REF, 3, 1)], {
      ...options,
      interval: { unit: "month", step: 1, key: "1 month" },
    });
    expect(month[0]!.label).toBe("Apr");
    const quarter = formatTemporalTickSequence([Date.UTC(REF, 3, 1)], {
      ...options,
      interval: { unit: "quarter", step: 1, key: "1 quarter" },
    });
    expect(quarter[0]!.label).toBe("Q2");
  });
});
