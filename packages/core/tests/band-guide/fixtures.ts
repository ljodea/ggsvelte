import { FONT_METRICS } from "../../src/layout/font-metrics.ts";
import { MetricsTableMeasurer } from "../../src/layout/measure.ts";
import { planBandAxis, type BandAxisPlanInput } from "../../src/layout/band-guide.ts";

export const measurer = new MetricsTableMeasurer(FONT_METRICS);

export const plan = (
  categories: string[],
  extentPx: number,
  over: Partial<BandAxisPlanInput> = {},
) =>
  planBandAxis({
    aesthetic: "x",
    panelIndex: 0,
    categoryCount: categories.length,
    entries: categories.map((value, domainIndex) => ({ value, label: value, domainIndex })),
    orient: "horizontal",
    extentPx,
    reverse: false,
    measurer,
    fontSize: 11,
    marginCapPx: extentPx * 0.35,
    orthogonalMarginCapPx: 105, // 0.35 * 300 (typical dashboard height)
    ...over,
  });
