/**
 * SveltePlot server render, line-3x1k (see ssr__svelteplot__scatter-color).
 */
import { render } from "svelte/server";

import LineChart from "../components/svelteplot/LineChart.svelte";
import { makeMultiSeries, PLOT_HEIGHT, PLOT_WIDTH } from "../scenarios";

const cols = makeMultiSeries(3, 1000);
const rows = cols.x.map((x, i) => ({ x, y: cols.y[i]!, series: cols.series[i]! }));

export function renderOnce(): { bytes: number; marks: number } {
  const { body } = render(LineChart, {
    props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
  });
  const marks = (body.match(/<path[\s>]/g) ?? []).length;
  return { bytes: body.length, marks, head: body.slice(0, 300) };
}
