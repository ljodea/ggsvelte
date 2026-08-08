/**
 * Unovis competitive mounts (Svelte components via @unovis/svelte).
 *
 * Unovis multi-series Line/Area/StackedBar want wide-form rows + arrays of
 * y accessors; scatter stays long-form with a color accessor. Area is
 * IDENTITY (one VisArea per series) so overlays match the rest of the suite
 * (#1357) — a single VisArea with multi-y would stack.
 *
 * Update scoreboard: mount + setRows + flushSync, same posture as
 * svelteplot/layercake adapters.
 */
import { flushSync, mount, unmount } from "svelte";

import AreaChart from "../components/unovis/AreaChart.svelte";
import BarsChart from "../components/unovis/BarsChart.svelte";
import LineChart from "../components/unovis/LineChart.svelte";
import ScatterChart from "../components/unovis/ScatterChart.svelte";
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
type WideRow = { x: number } & Record<string, number>;

function buildScatterRows(d: ScatterColumns): ScatterRow[] {
  return d.x.map((x, i) => ({ x, y: d.y[i]!, cls: d.cls[i]! }));
}

/** Long-form series columns → wide rows keyed by series name (shared x). */
function pivotSeries(d: SeriesColumns): { rows: WideRow[]; seriesNames: string[] } {
  const seriesNames: string[] = [];
  const seen = new Set<string>();
  for (const name of d.series) {
    if (!seen.has(name)) {
      seen.add(name);
      seriesNames.push(name);
    }
  }
  const byX = new Map<number, WideRow>();
  for (let i = 0; i < d.x.length; i++) {
    const x = d.x[i]!;
    let row = byX.get(x);
    if (row === undefined) {
      row = { x };
      byX.set(x, row);
    }
    row[d.series[i]!] = d.y[i]!;
  }
  return { rows: [...byX.values()], seriesNames };
}

/** Stacked bars → wide rows with dense category index on x. */
function pivotBars(d: BarsColumns): { rows: WideRow[]; stackNames: string[] } {
  const categories: string[] = [];
  const catIndex = new Map<string, number>();
  for (const cat of d.category) {
    if (!catIndex.has(cat)) {
      catIndex.set(cat, categories.length);
      categories.push(cat);
    }
  }
  const stackNames: string[] = [];
  const stackSeen = new Set<string>();
  for (const s of d.stack) {
    if (!stackSeen.has(s)) {
      stackSeen.add(s);
      stackNames.push(s);
    }
  }
  const rows: WideRow[] = categories.map((_, i) => {
    const row: WideRow = { x: i };
    for (const s of stackNames) row[s] = 0;
    return row;
  });
  for (let i = 0; i < d.category.length; i++) {
    const idx = catIndex.get(d.category[i]!)!;
    rows[idx]![d.stack[i]!] = d.value[i]!;
  }
  return { rows, stackNames };
}

export function mountUnovis(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): MountResult {
  root.replaceChildren();
  let component: { setRows: (next: never[]) => void };
  let update: (d: UpdateColumns) => void;
  switch (scenario) {
    case "scatter-color": {
      const props = {
        rows: buildScatterRows(data as ScatterColumns),
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(ScatterChart, { target: root, props }) as typeof component;
      update = (d) => {
        component.setRows(buildScatterRows(d as ScatterColumns) as never[]);
        flushSync();
      };
      break;
    }
    case "line-multiseries": {
      const pivoted = pivotSeries(data as SeriesColumns);
      const props = {
        rows: pivoted.rows,
        seriesNames: pivoted.seriesNames,
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(LineChart, { target: root, props }) as typeof component;
      update = (d) => {
        component.setRows(pivotSeries(d as SeriesColumns).rows as never[]);
        flushSync();
      };
      break;
    }
    case "area-multiseries": {
      const pivoted = pivotSeries(data as SeriesColumns);
      const props = {
        rows: pivoted.rows,
        seriesNames: pivoted.seriesNames,
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(AreaChart, { target: root, props }) as typeof component;
      update = (d) => {
        component.setRows(pivotSeries(d as SeriesColumns).rows as never[]);
        flushSync();
      };
      break;
    }
    case "bars-stacked": {
      const pivoted = pivotBars(data as BarsColumns);
      const props = {
        rows: pivoted.rows,
        stackNames: pivoted.stackNames,
        width: PLOT_WIDTH,
        height: PLOT_HEIGHT,
      };
      component = mount(BarsChart, { target: root, props }) as typeof component;
      update = (d) => {
        component.setRows(pivotBars(d as BarsColumns).rows as never[]);
        flushSync();
      };
      break;
    }
    default:
      throw new Error(`unovis does not implement ${scenario as string}`);
  }
  flushSync();
  return {
    // Unovis paints SVG via d3 after mount; mark count is best-effort (circles
    // for scatter, paths for line/area, rects for bars).
    markHint: root.querySelectorAll("circle, path, rect").length,
    handle: {
      destroy() {
        try {
          void unmount(component as Parameters<typeof unmount>[0]);
        } catch {
          // teardown between samples is best-effort
        }
      },
      update,
    },
  };
}
