/**
 * Apache ECharts competitive mounts (Canvas).
 */
import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import {
  COLORS,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

echarts.use([
  ScatterChart,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

export type UpdateColumns = ScatterColumns | SeriesColumns | BarsColumns;

export type EChartsHandle = {
  destroy: () => void;
  /** ECharts in-place update: setOption with the new series data (merge mode). */
  update: (data: UpdateColumns) => void;
};

function hostIn(root: HTMLElement): HTMLDivElement {
  root.replaceChildren();
  const el = document.createElement("div");
  el.style.width = `${PLOT_WIDTH}px`;
  el.style.height = `${PLOT_HEIGHT}px`;
  root.appendChild(el);
  return el;
}

function seriesFromLong(data: SeriesColumns) {
  const names = [...new Set(data.series)];
  const datasets = names.map((name) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < data.series.length; i++) {
      if (data.series[i] === name) pts.push([data.x[i]!, data.y[i]!]);
    }
    return { name, pts };
  });
  return datasets;
}

export function mountEcharts(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): { markHint: number; handle: EChartsHandle } {
  const el = hostIn(root);
  const chart = echarts.init(el, undefined, {
    width: PLOT_WIDTH,
    height: PLOT_HEIGHT,
    renderer: "canvas",
  });

  if (scenario === "scatter-color") {
    const optionFor = (scatter: ScatterColumns) => {
      const names = [...new Set(scatter.cls)];
      return {
        animation: false,
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: { type: "value" },
        yAxis: { type: "value" },
        series: names.map((name, i) => ({
          type: "scatter",
          name,
          symbolSize: 3,
          itemStyle: { color: COLORS[i % COLORS.length], opacity: 0.7 },
          data: scatter.x
            .map((x, idx) => (scatter.cls[idx] === name ? [x, scatter.y[idx]!] : null))
            .filter((d): d is [number, number] => d !== null),
        })),
      };
    };
    const scatter = data as ScatterColumns;
    chart.setOption(optionFor(scatter));
    return {
      markHint: scatter.x.length,
      handle: {
        destroy: () => {
          chart.dispose();
        },
        update: (d) => {
          // Series count is stable across update variants (rotated cls labels
          // are the same set), so index-merge setOption replaces the data.
          chart.setOption(optionFor(d as ScatterColumns));
        },
      },
    };
  }

  if (scenario === "bars-stacked") {
    const optionFor = (bars: BarsColumns) => {
      const categories = [...new Set(bars.category)];
      const stacks = [...new Set(bars.stack)];
      return {
        animation: false,
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: { type: "category", data: categories },
        yAxis: { type: "value" },
        series: stacks.map((stack, i) => ({
          type: "bar",
          name: stack,
          stack: "total",
          itemStyle: { color: COLORS[i % COLORS.length] },
          data: categories.map((cat) => {
            for (let j = 0; j < bars.category.length; j++) {
              if (bars.category[j] === cat && bars.stack[j] === stack) return bars.value[j]!;
            }
            return 0;
          }),
        })),
      };
    };
    const bars = data as BarsColumns;
    chart.setOption(optionFor(bars));
    return {
      markHint: bars.category.length,
      handle: {
        destroy: () => {
          chart.dispose();
        },
        update: (d) => {
          chart.setOption(optionFor(d as BarsColumns));
        },
      },
    };
  }

  const seriesData = data as SeriesColumns;
  const filled = scenario === "area-multiseries";
  const optionFor = (d: SeriesColumns) => {
    const datasets = seriesFromLong(d);
    return {
      animation: false,
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: "value" },
      yAxis: { type: "value" },
      series: datasets.map((ds, i) => ({
        type: "line",
        name: ds.name,
        showSymbol: false,
        itemStyle: { color: COLORS[i % COLORS.length] },
        areaStyle: filled ? { opacity: 0.25 } : undefined,
        data: ds.pts,
      })),
    };
  };
  chart.setOption(optionFor(seriesData));
  return {
    markHint: seriesData.x.length,
    handle: {
      destroy: () => {
        chart.dispose();
      },
      update: (d) => {
        chart.setOption(optionFor(d as SeriesColumns));
      },
    },
  };
}
