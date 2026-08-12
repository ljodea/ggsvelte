/**
 * Lean SVG-only ggsvelte mounts (keeps @ggsvelte/core/dom and planStrata out of the graph).
 */
import { renderToSVGString } from "@ggsvelte/core/headless";
import { aes, gg } from "@ggsvelte/spec/portable";

import {
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

export type UpdateColumns = ScatterColumns | SeriesColumns | BarsColumns;

export type MountHandle = {
  destroy: () => void;
  update: (data: UpdateColumns) => void;
};

export type MountResult = { markHint: number; handle: MountHandle };

function scatterSpec(data: ScatterColumns) {
  return gg(data, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7 })
    .toPortable();
}

function lineSpec(data: SeriesColumns) {
  return gg(data, aes({ x: "x", y: "y", color: "series", group: "series" }))
    .geomLine()
    .toPortable();
}

function areaSpec(data: SeriesColumns) {
  // Identity (not stack): competitors overlay series; default geomArea is stack.
  return gg(data, aes({ x: "x", y: "y", fill: "series", group: "series" }))
    .geomArea({ position: "identity" })
    .toPortable();
}

function barsSpec(data: BarsColumns) {
  return gg(data, aes({ x: "category", y: "value", fill: "stack" }))
    .geomCol()
    .toPortable();
}

export function mountGgsvelteSvg(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): MountResult {
  const render = (d: UpdateColumns): number => {
    let spec;
    switch (scenario) {
      case "scatter-color":
        spec = scatterSpec(d as ScatterColumns);
        break;
      case "line-multiseries":
        spec = lineSpec(d as SeriesColumns);
        break;
      case "area-multiseries":
        spec = areaSpec(d as SeriesColumns);
        break;
      case "bars-stacked":
        spec = barsSpec(d as BarsColumns);
        break;
    }
    const svg = renderToSVGString(spec, { width: PLOT_WIDTH, height: PLOT_HEIGHT });
    root.replaceChildren();
    root.innerHTML = svg;
    return root.querySelectorAll("circle, path, rect, line").length;
  };
  const markHint = render(data);
  return {
    markHint,
    handle: {
      // Honest update path TODAY: ggsvelte's lean SVG path has no in-place DOM
      // patching, so an update is a full re-render (new spec +
      // renderToSVGString) followed by a DOM swap — update == remount here.
      update: (d) => {
        render(d);
      },
      destroy: () => {
        root.replaceChildren();
      },
    },
  };
}

export function bundleScatterSvg(data: ScatterColumns): string {
  return renderToSVGString(scatterSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}

export function bundleLineSvg(data: SeriesColumns): string {
  return renderToSVGString(lineSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}

export function bundleAreaSvg(data: SeriesColumns): string {
  return renderToSVGString(areaSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}

export function bundleBarsSvg(data: BarsColumns): string {
  return renderToSVGString(barsSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}
