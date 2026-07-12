import { describe, expect, it } from "bun:test";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import { FONT_METRICS } from "../src/layout/font-metrics.ts";

describe("MetricsTableMeasurer", () => {
  const m = new MetricsTableMeasurer(FONT_METRICS);

  it("measures the empty string as 0", () => {
    expect(m.measureWidth("", 12)).toBe(0);
  });

  it("scales linearly with font size", () => {
    const w10 = m.measureWidth("Hello, 1234", 10);
    const w20 = m.measureWidth("Hello, 1234", 20);
    expect(w20).toBeCloseTo(w10 * 2, 10);
    expect(m.measureHeight(20)).toBeCloseTo(m.measureHeight(10) * 2, 10);
  });

  it("is additive per character (kerning ignored by design)", () => {
    const whole = m.measureWidth("Type", 12);
    const parts =
      m.measureWidth("T", 12) +
      m.measureWidth("y", 12) +
      m.measureWidth("p", 12) +
      m.measureWidth("e", 12);
    expect(whole).toBeCloseTo(parts, 10);
  });

  it("falls back to defaultAdvance for unknown characters", () => {
    // Greek sigma is outside the table.
    const w = m.measureWidth("σ", 100);
    expect(w).toBeCloseTo(FONT_METRICS.defaultAdvance, 10);
    // Astral code points count once, not per surrogate half.
    expect(m.measureWidth("𝕏", 100)).toBeCloseTo(FONT_METRICS.defaultAdvance, 10);
  });

  it("digit widths are uniform (Helvetica tabular digits)", () => {
    const w0 = m.measureWidth("0", 12);
    for (const d of "123456789") {
      expect(m.measureWidth(d, 12)).toBeCloseTo(w0, 10);
    }
  });

  it("height is ascent+descent scaled from refSize", () => {
    const expected = ((FONT_METRICS.ascent + FONT_METRICS.descent) * 11) / FONT_METRICS.refSize;
    expect(m.measureHeight(11)).toBeCloseTo(expected, 10);
  });
});
