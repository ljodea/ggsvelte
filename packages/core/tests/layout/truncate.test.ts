/**
 * Shared truncateToFit: binary search on keep length for measureWidth budgets.
 */
import { describe, expect, it } from "bun:test";

import { FONT_METRICS } from "../../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../../src/layout/measure.ts";
import { truncateToFit } from "../../src/layout/truncate.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);
const fontSize = 11;
const ellipsis = "…";

describe("truncateToFit", () => {
  it("returns the full label when it already fits", () => {
    expect(truncateToFit("OK", 1000, measurer, fontSize, ellipsis)).toBe("OK");
  });

  it("returns ellipsis alone when nothing shorter fits", () => {
    expect(truncateToFit("W", 0.5, measurer, fontSize, ellipsis)).toBe(ellipsis);
  });

  it("produces a shorter prefix+ellipsis that fits the budget", () => {
    const label = "Anlageverwaltungsgesellschaftsvertrag";
    const budget = 40;
    const out = truncateToFit(label, budget, measurer, fontSize, ellipsis);
    expect(out.endsWith(ellipsis)).toBe(true);
    expect(out.length).toBeLessThan(label.length);
    expect(measurer.measureWidth(out, fontSize)).toBeLessThanOrEqual(budget + 1e-6);
    // One more code point would exceed (maximal keep).
    // oxlint-disable-next-line typescript/no-misused-spread -- code-point split matches truncateToFit
    const chars = [...label];
    const prefix = out.endsWith(ellipsis) ? out.slice(0, -ellipsis.length) : out;
    // oxlint-disable-next-line typescript/no-misused-spread -- code-point count of prefix
    const keepCount = [...prefix].length;
    if (keepCount + 1 < chars.length) {
      const longer = chars.slice(0, keepCount + 1).join("") + ellipsis;
      expect(measurer.measureWidth(longer, fontSize)).toBeGreaterThan(budget);
    }
  });

  it("uses O(log L) measureWidth calls for long labels", () => {
    const label = "x".repeat(200);
    const budget = 50;
    let measures = 0;
    const counting = {
      measureWidth: (text: string, size: number) => {
        measures++;
        return measurer.measureWidth(text, size);
      },
      measureHeight: (size: number) => measurer.measureHeight(size),
    };
    const out = truncateToFit(label, budget, counting, fontSize, ellipsis);
    expect(out.endsWith(ellipsis)).toBe(true);
    // Linear scan would measure ~200 times; binary search is ~1 + log2(200) ≈ 9.
    expect(measures).toBeLessThanOrEqual(20);
    expect(measures).toBeGreaterThan(1);
  });
});
