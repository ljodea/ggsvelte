/**
 * uPlot competitive mounts (Canvas). Primary external speed bar for multi-series lines.
 */
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

import {
  COLORS,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

export type UPlotHandle = { destroy: () => void };

function seriesFromLong(data: SeriesColumns): {
  xs: number[];
  ys: number[][];
  names: string[];
} {
  const names = [...new Set(data.series)];
  const points = data.x.length / names.length;
  // Require shared x grid (makeMultiSeries guarantees this).
  const xs = data.x.slice(0, points);
  const ys = names.map((name) => {
    const out = Array.from<number>({ length: points });
    let j = 0;
    for (let i = 0; i < data.series.length; i++) {
      if (data.series[i] === name) out[j++] = data.y[i]!;
    }
    return out;
  });
  return { xs, ys, names };
}

export function mountUplot(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns,
  root: HTMLElement,
): { markHint: number; handle: UPlotHandle } {
  root.replaceChildren();
  if (scenario === "scatter-color") {
    const scatter = data as ScatterColumns;
    // uPlot requires data[0] (x) sorted ascending; it takes x-domain from first/last
    // samples. Sort outside the timed region would need harness changes — sort here
    // so paint cost still covers all N markers (not an off-canvas empty chart).
    const order = Array.from({ length: scatter.x.length }, (_, i) => i).toSorted(
      (a, b) => scatter.x[a]! - scatter.x[b]!,
    );
    const xs = order.map((i) => scatter.x[i]!);
    const ys = order.map((i) => scatter.y[i]!);
    // uPlot is not a scatter specialist; plot as points with one series of x/y.
    // Fairness: still a cold canvas chart with N markers.
    const opts: uPlot.Options = {
      width: PLOT_WIDTH,
      height: PLOT_HEIGHT,
      series: [
        {},
        {
          label: "y",
          stroke: COLORS[0],
          paths: () => null,
          points: { show: true, size: 3, fill: COLORS[0] },
        },
      ],
      scales: { x: { time: false }, y: {} },
      axes: [{}, {}],
      legend: { show: false },
    };
    const u = new uPlot(opts, [xs, ys], root);
    return { markHint: scatter.x.length, handle: { destroy: () => u.destroy() } };
  }

  const seriesData = data as SeriesColumns;
  const { xs, ys, names } = seriesFromLong(seriesData);
  const filled = scenario === "area-multiseries";
  const series: uPlot.Series[] = [
    {},
    ...names.map((name, i) => ({
      label: name,
      stroke: COLORS[i % COLORS.length],
      fill: filled ? COLORS[i % COLORS.length] : undefined,
      width: 1.5,
      points: { show: false },
    })),
  ];
  // uPlot fill needs alpha via fill-opacity CSS or rgba — use stroke-only for line,
  // and a light fill when area.
  if (filled) {
    for (let i = 1; i < series.length; i++) {
      const c = COLORS[(i - 1) % COLORS.length]!;
      series[i] = {
        ...series[i],
        fill: c,
        // uPlot accepts fill as color; opacity via fillTo
        paths: uPlot.paths.linear!(),
      };
    }
  }
  const opts: uPlot.Options = {
    width: PLOT_WIDTH,
    height: PLOT_HEIGHT,
    series,
    scales: { x: { time: false }, y: {} },
    axes: [{}, {}],
    legend: { show: false },
  };
  const aligned: uPlot.AlignedData = [xs, ...ys];
  const u = new uPlot(opts, aligned, root);
  return { markHint: names.length * xs.length, handle: { destroy: () => u.destroy() } };
}
