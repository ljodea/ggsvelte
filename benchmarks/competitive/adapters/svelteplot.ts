/**
 * SveltePlot browser mounts (Svelte components, real DOM).
 * Mirrors the d3/ggsvelte adapter shape so fixtures/main.ts can dispatch it.
 */
import { flushSync, mount, unmount } from "svelte";

import LineChart from "../components/svelteplot/LineChart.svelte";
import ScatterChart from "../components/svelteplot/ScatterChart.svelte";
import {
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

export type MountHandle = { destroy: () => void };
export type MountResult = { markHint: number; handle: MountHandle };

export function mountSveltePlot(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): MountResult {
  root.replaceChildren();
  let component;
  switch (scenario) {
    case "scatter-color": {
      const d = data as ScatterColumns;
      const rows = d.x.map((x, i) => ({ x, y: d.y[i]!, cls: d.cls[i]! }));
      component = mount(ScatterChart, {
        target: root,
        props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
      });
      break;
    }
    case "line-multiseries": {
      const d = data as SeriesColumns;
      const rows = d.x.map((x, i) => ({ x, y: d.y[i]!, series: d.series[i]! }));
      component = mount(LineChart, {
        target: root,
        props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
      });
      break;
    }
    default:
      throw new Error(`svelteplot does not implement ${scenario}`);
  }
  flushSync();
  return {
    markHint: root.querySelectorAll("circle, path").length,
    handle: {
      destroy() {
        try {
          void unmount(component);
        } catch {
          // teardown between samples is best-effort
        }
      },
    },
  };
}
