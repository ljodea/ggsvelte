/**
 * Unovis server render, line-3x1k (see ssr__unovis__scatter-color).
 * Wide-form rows match adapters/unovis.ts pivotSeries.
 */
import { render } from "svelte/server";

import LineChart from "../components/unovis/LineChart.svelte";
import { makeMultiSeries, PLOT_HEIGHT, PLOT_WIDTH } from "../scenarios";

const cols = makeMultiSeries(3, 1000);
const seriesNames: string[] = [];
const seen = new Set<string>();
for (const name of cols.series) {
  if (!seen.has(name)) {
    seen.add(name);
    seriesNames.push(name);
  }
}
const byX = new Map<number, { x: number } & Record<string, number>>();
for (let i = 0; i < cols.x.length; i++) {
  const x = cols.x[i]!;
  let row = byX.get(x);
  if (row === undefined) {
    row = { x };
    byX.set(x, row);
  }
  row[cols.series[i]!] = cols.y[i]!;
}
const rows = [...byX.values()];

export function renderOnce(): { bytes: number; marks: number; head: string } {
  const { body } = render(LineChart, {
    props: { rows, seriesNames, width: PLOT_WIDTH, height: PLOT_HEIGHT },
  });
  const marks = (body.match(/<path[\s>]/g) ?? []).length;
  return { bytes: body.length, marks, head: body.slice(0, 300) };
}
