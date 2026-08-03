/**
 * LayerCake competitive mounts (Svelte 5 components, SVG marks).
 */
import { flushSync, mount, unmount } from "svelte";

import LineChart from "../components/layercake/LineChart.svelte";
import ScatterChart from "../components/layercake/ScatterChart.svelte";
import {
  COLORS,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

export type LayerCakeHandle = { destroy: () => void };

export function mountLayerCake(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): { markHint: number; handle: LayerCakeHandle } {
  root.replaceChildren();
  let comp;
  if (scenario === "scatter-color") {
    const scatter = data as ScatterColumns;
    const rows = scatter.x.map((x, i) => ({
      x,
      y: scatter.y[i]!,
      cls: scatter.cls[i]!,
    }));
    comp = mount(ScatterChart, {
      target: root,
      props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
    });
  } else if (scenario === "line-multiseries") {
    const seriesData = data as SeriesColumns;
    const seriesIndex = new Map<string, number>();
    for (const name of seriesData.series) {
      if (!seriesIndex.has(name)) seriesIndex.set(name, seriesIndex.size);
    }
    const rows = seriesData.x.map((x, i) => {
      const series = seriesData.series[i]!;
      const sIndex = seriesIndex.get(series)!;
      return {
        x,
        y: seriesData.y[i]!,
        series,
        color: COLORS[sIndex % COLORS.length],
      };
    });
    comp = mount(LineChart, {
      target: root,
      props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
    });
  } else {
    throw new Error(`layercake does not implement ${scenario}`);
  }
  flushSync();
  return {
    markHint: root.querySelectorAll("circle, path").length,
    handle: {
      destroy: () => {
        try {
          void unmount(comp);
        } catch {
          // already unmounted
        }
      },
    },
  };
}
