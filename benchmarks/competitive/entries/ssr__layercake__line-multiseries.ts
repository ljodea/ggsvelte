/**
 * LayerCake server render, line-3x1k (see ssr__layercake__scatter-color).
 * Row shape matches adapters/layercake.ts buildSeriesRows (per-row color).
 */
import { render } from "svelte/server";

import LineChart from "../components/layercake-ssr/LineChart.svelte";
import { COLORS, makeMultiSeries, PLOT_HEIGHT, PLOT_WIDTH } from "../scenarios";

const cols = makeMultiSeries(3, 1000);
const seriesIndex = new Map<string, number>();
for (const name of cols.series) {
  if (!seriesIndex.has(name)) seriesIndex.set(name, seriesIndex.size);
}
const rows = cols.x.map((x, i) => {
  const series = cols.series[i]!;
  return { x, y: cols.y[i]!, series, color: COLORS[seriesIndex.get(series)! % COLORS.length]! };
});

export function renderOnce(): { bytes: number; marks: number } {
  const { body } = render(LineChart, {
    props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
  });
  const marks = (body.match(/<path[\s>]/g) ?? []).length;
  return { bytes: body.length, marks, head: body.slice(0, 300) };
}
