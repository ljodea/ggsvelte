/**
 * Lean date-axis tick path: without the temporal runtime, deriveTicks must
 * still honor author-configured breaks (Devin on #1291).
 */
import { describe, expect, it } from "bun:test";

import { deriveTicks, type DeriveTicksContext } from "../../src/layout/layout-derive-ticks.ts";
import type { Domain } from "../../src/layout/layout-types.ts";
import { FONT_METRICS } from "../../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../../src/layout/measure.ts";
import { getTemporalRuntime, resetTemporalRuntimeForTests } from "../../src/temporal-runtime.ts";
import { installTemporal } from "../../src/install-temporal.ts";

const measurer = new MetricsTableMeasurer(FONT_METRICS);

function horizontalCtx(extentPx = 400): DeriveTicksContext {
  return {
    orient: "horizontal",
    extentPx,
    measurer,
    fontSize: 11,
    marginCapPx: 80,
    orthogonalMarginCapPx: 80,
    orthogonalChromePx: 10,
  };
}

describe("lean deriveTicks time breaks (no temporal runtime)", () => {
  it("uses converted domain.breaks when domain.temporal is set but runtime is absent", () => {
    resetTemporalRuntimeForTests();
    expect(getTemporalRuntime()).toBeNull();
    try {
      const domain: Domain = {
        type: "time",
        min: Date.UTC(2024, 0, 1),
        max: Date.UTC(2024, 0, 31),
        breaks: [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 15), Date.UTC(2024, 0, 31)],
        temporal: {
          aesthetic: "x",
          panelIndex: 0,
          kind: "date",
          config: {},
          sourceBreaks: ["2024-01-01", "2024-01-15", "2024-01-31"],
        },
      };
      const result = deriveTicks(domain, 5, undefined, horizontalCtx());
      expect(result.ticks.map((tick) => tick.value)).toEqual([
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 15),
        Date.UTC(2024, 0, 31),
      ]);
      expect(result.guidePlan).toBeUndefined();
    } finally {
      installTemporal();
      expect(getTemporalRuntime()).not.toBeNull();
    }
  });
});
