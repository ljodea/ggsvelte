/**
 * TanStack Charts React host (`@tanstack/charts/react`).
 * Generalist comparator alongside ECharts / Chart.js / D3 / uPlot.
 */
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { Chart } from "@tanstack/charts/react";

import { defineArea, defineBars, defineLine, defineScatter } from "./tanstack-defs";
import {
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

type UpdateColumns = ScatterColumns | SeriesColumns | BarsColumns;

export type MountResult = {
  markHint: number;
  handle: { destroy: () => void; update: (data: UpdateColumns) => void };
};

type ScatterRow = { x: number; y: number; cls: string };
type SeriesRow = { x: number; y: number; series: string };
type BarRow = { category: string; value: number; stack: string };

function buildScatterRows(d: ScatterColumns): ScatterRow[] {
  return d.x.map((x, i) => ({ x, y: d.y[i]!, cls: d.cls[i]! }));
}

function buildSeriesRows(d: SeriesColumns): SeriesRow[] {
  return d.x.map((x, i) => ({ x, y: d.y[i]!, series: d.series[i]! }));
}

function buildBarRows(d: BarsColumns): BarRow[] {
  return d.category.map((category, i) => ({
    category,
    value: d.value[i]!,
    stack: d.stack[i]!,
  }));
}

function definitionFor(scenario: ScenarioId, data: UpdateColumns) {
  switch (scenario) {
    case "scatter-color":
      return defineScatter(buildScatterRows(data as ScatterColumns));
    case "line-multiseries":
      return defineLine(buildSeriesRows(data as SeriesColumns));
    case "area-multiseries":
      return defineArea(buildSeriesRows(data as SeriesColumns));
    case "bars-stacked":
      return defineBars(buildBarRows(data as BarsColumns));
    default:
      throw new Error(`tanstack-react does not implement ${scenario}`);
  }
}

function paint(reactRoot: Root, scenario: ScenarioId, data: UpdateColumns): void {
  flushSync(() => {
    reactRoot.render(
      createElement(Chart, {
        definition: definitionFor(scenario, data),
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
        ariaLabel: `tanstack-react ${scenario}`,
      }),
    );
  });
}

export function mountTanstackReact(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): MountResult {
  root.replaceChildren();
  const el = document.createElement("div");
  el.style.width = `${PLOT_WIDTH}px`;
  el.style.height = `${PLOT_HEIGHT}px`;
  root.appendChild(el);
  const reactRoot = createRoot(el);
  paint(reactRoot, scenario, data);
  const markHint =
    scenario === "scatter-color"
      ? (data as ScatterColumns).x.length
      : scenario === "bars-stacked"
        ? (data as BarsColumns).category.length
        : (data as SeriesColumns).x.length;
  return {
    markHint,
    handle: {
      destroy() {
        flushSync(() => {
          reactRoot.unmount();
        });
      },
      update(next) {
        paint(reactRoot, scenario, next);
      },
    },
  };
}
