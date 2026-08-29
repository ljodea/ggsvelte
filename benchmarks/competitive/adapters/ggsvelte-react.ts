import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

import { GGPlot } from "@ggsvelte/react";
import type { SpecInput } from "@ggsvelte/spec/portable";

import {
  COLORS,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type ScatterColumns,
  type ScenarioId,
} from "../scenarios";

function specFor(data: ScatterColumns): SpecInput {
  return {
    data: { columns: data },
    aes: { x: "x", y: "y", color: "cls" },
    layers: [{ geom: "point", render: "svg", params: { size: 1.5, alpha: 0.7 } }],
    scales: {
      color: {
        type: "manual",
        domain: ["series-0", "series-1", "series-2", "series-3", "series-4"],
        range: COLORS.slice(0, 5),
      },
    },
  };
}

function Chart({ data }: { data: ScatterColumns }) {
  const [current, setCurrent] = useState(data);
  (
    globalThis as { __ggsvelteReactSetData?: (next: ScatterColumns) => void }
  ).__ggsvelteReactSetData = setCurrent;
  return createElement(GGPlot, {
    spec: specFor(current),
    width: PLOT_WIDTH,
    height: PLOT_HEIGHT,
  });
}

export function mountGgsvelteReact(scenario: ScenarioId, data: ScatterColumns, root: HTMLElement) {
  if (scenario !== "scatter-color")
    throw new Error(`ggsvelte-react does not implement ${scenario}`);
  root.replaceChildren();
  const el = document.createElement("div");
  el.style.width = `${PLOT_WIDTH}px`;
  el.style.height = `${PLOT_HEIGHT}px`;
  root.appendChild(el);
  const reactRoot: Root = createRoot(el);
  flushSync(() => {
    reactRoot.render(createElement(Chart, { data }));
  });
  return {
    markHint: root.querySelectorAll("circle, path, rect").length,
    handle: {
      update(next: ScatterColumns) {
        flushSync(() => {
          (
            globalThis as { __ggsvelteReactSetData?: (n: ScatterColumns) => void }
          ).__ggsvelteReactSetData?.(next);
        });
      },
      destroy() {
        flushSync(() => {
          reactRoot.unmount();
        });
      },
    },
  };
}
