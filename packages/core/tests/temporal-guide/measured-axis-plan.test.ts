import { describe, expect, it } from "bun:test";

import { planTemporalAxis } from "../../src/layout/temporal-guide.ts";
import { measurer } from "./fixtures.ts";

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

  it("keeps automatic date guides day-or-coarser without restricting authored intervals", () => {
    const planShortSpan = (kind: "date" | "datetime", config = {}) =>
      planTemporalAxis({
        aesthetic: "x",
        panelIndex: 0,
        domain: [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 2)],
        kind,
        orient: "horizontal",
        extentPx: 640,
        reverse: false,
        measurer,
        fontSize: 11,
        marginCapPx: 224,
        config,
      });
    const date = planShortSpan("date");
    expect(date.interval).toBe("1 day");
    expect(
      date.ticks
        .filter((tick) => tick.kind === "major")
        .every((tick) => (tick.value as number) % (24 * 60 * 60 * 1_000) === 0),
    ).toBe(true);
    expect(planShortSpan("datetime").interval).toBe("6 hours");
    expect(planShortSpan("date", { dateBreaks: "6 hours" }).interval).toBe("6 hours");
  });

  it("derives explicit-break labels from the smallest surviving gap", () => {
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(2024, 0, 1), Date.UTC(2025, 1, 1)],
      breaks: [Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1), Date.UTC(2025, 1, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 640,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 224,
      config: {},
    });
    expect(plan.source).toBe("explicit");
    expect(plan.interval).toBeNull();
    expect(plan.ticks.map((tick) => tick.label)).toEqual(["Jan 2024", "Jan 2025", "Feb 2025"]);
  });

  it("keeps interval tie-breaks stable at neighboring integer widths", () => {
    expect([319, 320, 321].map((width) => planYears(width).interval)).toEqual([
      "50 years",
      "50 years",
      "50 years",
    ]);
  });

  it("retains a fitting Pass-A interval and walks multiple coarser steps when needed", () => {
    const retained = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(1835, 0, 1), Date.UTC(2025, 0, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 320,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 112,
      config: {},
      previousInterval: "100 years",
    });
    expect(planYears(320).interval).toBe("50 years");
    expect(retained.interval).toBe("100 years");

    const coarsened = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(1835, 0, 1), Date.UTC(2025, 0, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 80,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 28,
      config: {},
      previousInterval: "10 years",
    });
    expect(coarsened.interval).toBe("100 years");
    expect(coarsened.overlap).toBe(false);
  });

  it("keeps the coarsest bounded plan and reports overlap when the ladder is exhausted", () => {
    const epochYear = (year: number) => {
      const date = new Date(0);
      date.setUTCFullYear(year, 0, 1);
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    };
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [epochYear(0), epochYear(10_000)],
      kind: "date",
      orient: "horizontal",
      extentPx: 1,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 100,
      config: {},
      previousInterval: "100 years",
    });
    expect(plan.interval).toBe("5000 years");
    expect(plan.overlap).toBe(true);
    expect(plan.degraded).toContain("temporal-label-overlap");
  });

  it("uses the requested locale for planner-produced labels", () => {
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(2024, 0, 1), Date.UTC(2024, 1, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 640,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 224,
      config: { dateBreaks: "1 month", dateLabels: "%B", locale: "fr-FR" },
    });
    expect(plan.ticks[0]?.label.toLocaleLowerCase("fr-FR")).toBe("janvier");
    expect(plan.locale).toBe("fr-FR");
  });

  it("reports orthogonal margin overflow without changing authored labels", () => {
    const plan = planTemporalAxis({
      aesthetic: "x",
      panelIndex: 0,
      domain: [Date.UTC(2024, 0, 1), Date.UTC(2024, 1, 1)],
      kind: "date",
      orient: "horizontal",
      extentPx: 640,
      reverse: false,
      measurer,
      fontSize: 11,
      marginCapPx: 1_000,
      orthogonalMarginCapPx: 5,
      config: { dateBreaks: "1 month", dateLabels: "%Y-%m-%d" },
    });
    expect(plan.ticks.map((tick) => tick.label)).toEqual(["2024-01-01", "2024-02-01"]);
    expect(plan.marginOverflow).toBe(true);
    expect(plan.degraded).toContain("temporal-label-margin-overflow");
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
    expect(plan.interval).toBe("1 month");
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
    const minor = plan.ticks.filter((tick) => tick.kind === "minor");
    expect(minor.length).toBeGreaterThan(0);
    expect(minor.every((tick) => !major.has(tick.value))).toBe(true);
  });
});

describe("month-day axis plan", () => {
  const REF = 2000;
  const planBloom = (config = {}, extentPx = 420) =>
    planTemporalAxis({
      aesthetic: "y",
      panelIndex: 0,
      // The Kyoto bloom window: mid-March to mid-May, one year wide.
      domain: [Date.UTC(REF, 2, 18), Date.UTC(REF, 4, 10)],
      kind: "monthDay",
      orient: "vertical",
      extentPx,
      reverse: true,
      measurer,
      fontSize: 11,
      marginCapPx: 160,
      config,
    });

  it("labels every tick with a month and a day, never a year", () => {
    const plan = planBloom();
    const majors = plan.ticks.filter((tick) => tick.kind === "major");
    expect(majors.length).toBeGreaterThanOrEqual(2);
    for (const tick of majors) {
      // A month name alone ("Apr") is a legitimate pick at a coarse interval;
      // what must never appear is a year.
      expect(tick.label).toMatch(/^[A-Z][a-z]{2}( \d{1,2})?$/);
      expect(tick.label).not.toContain(String(REF));
    }
  });

  it("never picks an interval a yearless axis cannot mean", () => {
    // A year tick would be the same tick twice over, and a week tick implies a
    // weekday — which belongs to the reference year, not to the data.
    for (const extentPx of [200, 420, 900]) {
      const { interval } = planBloom({}, extentPx);
      expect(interval, String(extentPx)).not.toContain("year");
      expect(interval, String(extentPx)).not.toContain("week");
    }
  });

  it("honours an authored interval and keeps its labels year-free", () => {
    const plan = planBloom({ dateBreaks: "10 days" });
    expect(plan.interval).toContain("day");
    for (const tick of plan.ticks.filter((candidate) => candidate.kind === "major")) {
      expect(tick.label).not.toContain(String(REF));
    }
  });
});
