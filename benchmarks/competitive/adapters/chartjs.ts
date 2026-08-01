/**
 * Chart.js competitive mounts (Canvas).
 */
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from "chart.js";

import {
  COLORS,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

Chart.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  LineController,
  ScatterController,
  BarElement,
  BarController,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

export type ChartJsHandle = { destroy: () => void };

function canvasIn(root: HTMLElement): HTMLCanvasElement {
  root.replaceChildren();
  const canvas = document.createElement("canvas");
  canvas.width = PLOT_WIDTH;
  canvas.height = PLOT_HEIGHT;
  canvas.style.width = `${PLOT_WIDTH}px`;
  canvas.style.height = `${PLOT_HEIGHT}px`;
  root.appendChild(canvas);
  return canvas;
}

function seriesFromLong(data: SeriesColumns) {
  const names = [...new Set(data.series)];
  const points = data.x.length / names.length;
  const labels = data.x.slice(0, points);
  const datasets = names.map((name, i) => {
    const values: number[] = [];
    for (let j = 0; j < data.series.length; j++) {
      if (data.series[j] === name) values.push(data.y[j]!);
    }
    return {
      label: name,
      data: values,
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length],
      pointRadius: 0,
      borderWidth: 1.5,
      fill: false as boolean | string,
    };
  });
  return { labels, datasets };
}

export function mountChartJs(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): { markHint: number; handle: ChartJsHandle } {
  const canvas = canvasIn(root);
  if (scenario === "scatter-color") {
    const scatter = data as ScatterColumns;
    const bySeries = new Map<string, { x: number; y: number }[]>();
    for (let i = 0; i < scatter.x.length; i++) {
      const cls = scatter.cls[i]!;
      let pts = bySeries.get(cls);
      if (pts === undefined) {
        pts = [];
        bySeries.set(cls, pts);
      }
      pts.push({ x: scatter.x[i]!, y: scatter.y[i]! });
    }
    const chart = new Chart(canvas, {
      type: "scatter",
      data: {
        datasets: [...bySeries.entries()].map(([label, pts], i) => ({
          label,
          data: pts,
          backgroundColor: COLORS[i % COLORS.length],
          pointRadius: 1.5,
        })),
      },
      options: {
        animation: false,
        responsive: false,
        plugins: { legend: { display: false } },
        scales: { x: { type: "linear" }, y: { type: "linear" } },
      },
    });
    return {
      markHint: scatter.x.length,
      handle: { destroy: () => chart.destroy() },
    };
  }

  if (scenario === "bars-stacked") {
    const bars = data as BarsColumns;
    const categories = [...new Set(bars.category)];
    const stacks = [...new Set(bars.stack)];
    const datasets = stacks.map((stack, i) => ({
      label: stack,
      data: categories.map((cat) => {
        for (let j = 0; j < bars.category.length; j++) {
          if (bars.category[j] === cat && bars.stack[j] === stack) return bars.value[j]!;
        }
        return 0;
      }),
      backgroundColor: COLORS[i % COLORS.length],
      stack: "total",
    }));
    const chart = new Chart(canvas, {
      type: "bar",
      data: { labels: categories, datasets },
      options: {
        animation: false,
        responsive: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: true },
          y: { stacked: true },
        },
      },
    });
    return {
      markHint: bars.category.length,
      handle: { destroy: () => chart.destroy() },
    };
  }

  const seriesData = data as SeriesColumns;
  const { labels, datasets } = seriesFromLong(seriesData);
  const filled = scenario === "area-multiseries";
  for (const ds of datasets) {
    ds.fill = filled;
    if (filled) ds.backgroundColor = `${ds.backgroundColor}55`;
  }
  const chart = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      animation: false,
      responsive: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { type: "linear" },
        y: { type: "linear" },
      },
      elements: { line: { tension: 0 } },
    },
  });
  return {
    markHint: seriesData.x.length,
    handle: { destroy: () => chart.destroy() },
  };
}
