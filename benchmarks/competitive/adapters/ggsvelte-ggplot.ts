import { flushSync, mount, unmount } from "svelte";

import GGPlotChart from "../components/ggsvelte/GGPlotChart.svelte";
import { PLOT_HEIGHT, PLOT_WIDTH, type ScatterColumns, type ScenarioId } from "../scenarios";

export function mountGgsvelteGgplot(scenario: ScenarioId, data: ScatterColumns, root: HTMLElement) {
  if (scenario !== "scatter-color")
    throw new Error(`ggsvelte-ggplot does not implement ${scenario}`);
  root.replaceChildren();
  const component = mount(GGPlotChart, {
    target: root,
    props: { data, width: PLOT_WIDTH, height: PLOT_HEIGHT },
  });
  flushSync();
  return {
    markHint: root.querySelectorAll("circle, path, rect").length,
    handle: {
      update(next: ScatterColumns) {
        component.setData(next);
        flushSync();
      },
      destroy() {
        void unmount(component);
      },
    },
  };
}
