/**
 * TanStack Charts Svelte host (`@tanstack/charts/svelte`).
 * Direct Svelte-peer comparator to ggsvelte — same fixture posture as
 * svelteplot / layercake / unovis.
 */
import { flushSync, mount, unmount } from "svelte";

import AreaChart from "../components/tanstack-svelte/AreaChart.svelte";
import BarsChart from "../components/tanstack-svelte/BarsChart.svelte";
import LineChart from "../components/tanstack-svelte/LineChart.svelte";
import ScatterChart from "../components/tanstack-svelte/ScatterChart.svelte";
import {
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

type UpdateColumns = ScatterColumns | SeriesColumns | BarsColumns;

type MountHandle = {
  destroy: () => void;
  update: (data: UpdateColumns) => void;
};
export type MountResult = { markHint: number; handle: MountHandle };

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

export function mountTanstackSvelte(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): MountResult {
  root.replaceChildren();
  let component;
  let update: (d: UpdateColumns) => void;
  switch (scenario) {
    case "scatter-color": {
      const props = {
        rows: buildScatterRows(data as ScatterColumns),
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(ScatterChart, { target: root, props });
      update = (d) => {
        component.setRows(buildScatterRows(d as ScatterColumns));
        flushSync();
      };
      break;
    }
    case "line-multiseries": {
      const props = {
        rows: buildSeriesRows(data as SeriesColumns),
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(LineChart, { target: root, props });
      update = (d) => {
        component.setRows(buildSeriesRows(d as SeriesColumns));
        flushSync();
      };
      break;
    }
    case "area-multiseries": {
      const props = {
        rows: buildSeriesRows(data as SeriesColumns),
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(AreaChart, { target: root, props });
      update = (d) => {
        component.setRows(buildSeriesRows(d as SeriesColumns));
        flushSync();
      };
      break;
    }
    case "bars-stacked": {
      const props = {
        rows: buildBarRows(data as BarsColumns),
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(BarsChart, { target: root, props });
      update = (d) => {
        component.setRows(buildBarRows(d as BarsColumns));
        flushSync();
      };
      break;
    }
    default:
      throw new Error(`tanstack-svelte does not implement ${scenario}`);
  }
  flushSync();
  return {
    markHint: root.querySelectorAll("circle, path, rect").length,
    handle: {
      destroy() {
        try {
          void unmount(component);
        } catch {
          // teardown between samples is best-effort
        }
      },
      update,
    },
  };
}
