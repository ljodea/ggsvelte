/**
 * Legend entry labels truncate via shared truncateToFit (binary search on keep
 * length): O(log L) measureWidth calls per long label, not a reverse linear
 * scan. Covers discrete and steps call sites in buildLegends.
 */
import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import { MetricsTableMeasurer, type TextMeasurer } from "../src/layout/measure.ts";
import { truncateToFit } from "../src/layout/truncate.ts";
import { buildLegends, type DiscreteLegendInput, type StepsLegendInput } from "../src/legend.ts";

const baseMeasurer = new MetricsTableMeasurer(FONT_METRICS);
const FONT_SIZE = 11;
const ELLIPSIS = "…";

function countingMeasurer(): { measurer: TextMeasurer; count: () => number; reset: () => void } {
  let measures = 0;
  return {
    measurer: {
      measureWidth: (text, size) => {
        measures++;
        return baseMeasurer.measureWidth(text, size);
      },
      measureHeight: (size) => baseMeasurer.measureHeight(size),
    },
    count: () => measures,
    reset: () => {
      measures = 0;
    },
  };
}

function discreteInput(labels: readonly string[]): DiscreteLegendInput {
  return {
    kind: "discrete",
    scale: "color",
    title: "",
    domain: labels,
    firstSeen: labels,
    colorOf: () => "#000",
  };
}

function stepsInput(labels: readonly string[]): StepsLegendInput {
  return {
    kind: "steps",
    scale: "fill",
    title: "",
    entries: labels.map((label) => ({ label, color: "#000" })),
  };
}

describe("buildLegends truncation", () => {
  it("truncates a long discrete entry to fit maxLabelWidth (matches truncateToFit)", () => {
    const label = "Anlageverwaltungsgesellschaftsvertrag";
    // maxWidth must leave a positive label budget after padding+swatch (4*2+10+6=24).
    const maxWidth = 60;
    const maxLabelWidth = Math.max(1, maxWidth - 4 * 2 - 10 - 6);
    const block = buildLegends([discreteInput([label])], "stable-domain", baseMeasurer, maxWidth);
    const legend = block.legends[0]!;
    expect(legend.type).toBe("discrete");
    if (legend.type !== "discrete") return;
    const out = legend.entries[0]!.label;
    expect(out).toBe(truncateToFit(label, maxLabelWidth, baseMeasurer, FONT_SIZE, ELLIPSIS));
    expect(out.endsWith(ELLIPSIS)).toBe(true);
    expect(baseMeasurer.measureWidth(out, FONT_SIZE)).toBeLessThanOrEqual(maxLabelWidth + 1e-6);
  });

  it("truncates a long steps entry the same way", () => {
    const label = "x".repeat(80);
    const maxWidth = 50;
    const maxLabelWidth = Math.max(1, maxWidth - 4 * 2 - 12 - 6);
    const block = buildLegends([stepsInput([label])], "stable-domain", baseMeasurer, maxWidth);
    const legend = block.legends[0]!;
    expect(legend.type).toBe("steps");
    if (legend.type !== "steps") return;
    const out = legend.entries[0]!.label;
    expect(out).toBe(truncateToFit(label, maxLabelWidth, baseMeasurer, FONT_SIZE, ELLIPSIS));
    expect(out.endsWith(ELLIPSIS)).toBe(true);
  });

  it("uses far fewer than L measureWidth calls for a long discrete label", () => {
    const label = "x".repeat(200);
    const maxWidth = 50;
    const counter = countingMeasurer();
    buildLegends([discreteInput([label])], "stable-domain", counter.measurer, maxWidth);
    // Linear reverse scan measures ~L candidates; binary search is ~1+log2(L)+overhead
    // (full label, truncated remeasure for labelWidth). Keep a hard ceiling well below L.
    expect(counter.count()).toBeLessThan(40);
    expect(counter.count()).toBeGreaterThan(1);
  });

  it("measureWidth count grows only logarithmically with label length", () => {
    const maxWidth = 50;
    const short = "x".repeat(40);
    const long = "x".repeat(400);
    const counter = countingMeasurer();
    buildLegends([discreteInput([short])], "stable-domain", counter.measurer, maxWidth);
    const shortCount = counter.count();
    counter.reset();
    buildLegends([discreteInput([long])], "stable-domain", counter.measurer, maxWidth);
    const longCount = counter.count();
    // 10× longer should not cost 10× measures (linear would). Allow small log growth + noise.
    expect(longCount).toBeLessThan(shortCount + 15);
    expect(longCount).toBeLessThan(50);
  });
});
