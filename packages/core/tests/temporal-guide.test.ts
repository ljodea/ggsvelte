import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import { compileTemporalLabelFormat, formatTemporalTickSequence } from "../src/layout/format.ts";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import { planTemporalAxis } from "../src/layout/temporal-guide.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);

describe("temporal label formatting", () => {
  it("formats strict tokens in an explicit locale and IANA timezone", () => {
    const format = compileTemporalLabelFormat("%a %e %b %Y %I:%M %p %Z", {
      kind: "datetime",
      locale: "en-US",
      timezone: "America/New_York",
    });
    expect(format(Date.UTC(2024, 2, 10, 7, 30))).toBe("Sun 10 Mar 2024 03:30 AM EDT");
  });

  it("keeps date-kind labels on UTC calendar fields", () => {
    const format = compileTemporalLabelFormat("%Y-%m-%d", {
      kind: "date",
      locale: "en-US",
      timezone: "Asia/Tokyo",
    });
    expect(format(Date.UTC(2024, 0, 1, 23))).toBe("2024-01-01");
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

describe("measured temporal axis GuidePlan", () => {
  const planYears = (extentPx: number) =>
    planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(1835, 0, 1), Date.UTC(2025, 0, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: extentPx * 0.35,
      config: {},
    });

  it("chooses non-overlapping calendar labels for the 191-year fixture", () => {
    for (const width of [320, 640, 1200]) {
      const plan = planYears(width);
      expect(plan.type).toBe("axis");
      expect(plan.scaleType).toBe("time");
      expect(plan.overlap, String(width)).toBe(false);
      const count = plan.ticks.filter((tick) => tick.kind === "major").length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(7);
      expect(plan.ticks.every((tick) => tick.value >= plan.domain[0]!)).toBe(true);
      expect(plan.ticks.every((tick) => tick.value <= plan.domain[1]!)).toBe(true);
    }
  });

  it("retains or moves only coarser from a prior-pass interval", () => {
    const passA = planYears(1200);
    const passB = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(1835, 0, 1), Date.UTC(2025, 0, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 180,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 63,
      config: {},
      previousInterval: passA.interval,
    });
    expect(passB.interval).not.toBeNull();
    expect(passB.ticks.length).toBeLessThanOrEqual(passA.ticks.length);
  });

  it("preserves explicit intervals and labels while reporting overlap", () => {
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 3,
      domain: [Date.UTC(2024, 0, 1), Date.UTC(2024, 11, 31)],
      kind: "date",
      orient: "horizontal",
      extentPx: 120,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 42,
      config: { dateBreaks: "1 month", dateLabels: "%Y-%m-%d" },
    });
    expect(plan.source).toBe("interval");
    expect(plan.ticks.filter((tick) => tick.kind === "major")).toHaveLength(12);
    expect(plan.ticks[0]?.label).toBe("2024-01-01");
    expect(plan.overlap).toBe(true);
  });

  it("keeps minor ticks separate and lets a coincident major win", () => {
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(2024, 0, 1), Date.UTC(2024, 3, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 640,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 224,
      config: { dateBreaks: "1 month", dateMinorBreaks: "1 week" },
    });
    const major = new Set(
      plan.ticks.filter((tick) => tick.kind === "major").map((tick) => tick.value),
    );
    expect(
      plan.ticks.filter((tick) => tick.kind === "minor").every((tick) => !major.has(tick.value)),
    ).toBe(true);
  });
});
