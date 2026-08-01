/**
 * Canvas-mark ggsvelte mounts (pipeline + planStrata + drawStratum).
 * Note: importing planStrata from @ggsvelte/core (not /render) until strata
 * is re-exported from the lean entry.
 */
import { planStrata } from "@ggsvelte/core";
import { cssColorResolver, drawStratum, sizeCanvasForDpr } from "@ggsvelte/core/dom";
import { runPipeline } from "@ggsvelte/core/render";
import { aes, gg } from "@ggsvelte/spec/portable";

import {
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

export type MountResult = { markHint: number };

function scatterSpec(data: ScatterColumns) {
  return gg(data, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7, render: "canvas" })
    .toPortable();
}

function lineSpec(data: SeriesColumns) {
  return gg(data, aes({ x: "x", y: "y", color: "series", group: "series" }))
    .geomLine({ render: "canvas" })
    .toPortable();
}

function areaSpec(data: SeriesColumns) {
  return gg(data, aes({ x: "x", y: "y", fill: "series", group: "series" }))
    .geomArea({ render: "canvas" })
    .toPortable();
}

export function mountGgsvelteCanvas(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns,
  root: HTMLElement,
): MountResult {
  if (scenario === "bars-stacked") {
    throw new Error("ggsvelte-canvas competitive path skips bars-stacked");
  }
  let spec;
  switch (scenario) {
    case "scatter-color":
      spec = scatterSpec(data as ScatterColumns);
      break;
    case "line-multiseries":
      spec = lineSpec(data as SeriesColumns);
      break;
    case "area-multiseries":
      spec = areaSpec(data as SeriesColumns);
      break;
    default:
      throw new Error(`unsupported canvas scenario ${scenario}`);
  }
  const model = runPipeline(spec, { width: PLOT_WIDTH, height: PLOT_HEIGHT });
  const strata = planStrata(model.scene, model.layerBackends);
  root.replaceChildren();
  // Axes/text stay un-drawn in this harness (canvas marks only) so paint cost
  // isolates mark drawing — documented in README fairness notes.
  const canvas = document.createElement("canvas");
  canvas.style.width = `${PLOT_WIDTH}px`;
  canvas.style.height = `${PLOT_HEIGHT}px`;
  root.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("2d context unavailable");
  const dpr = window.devicePixelRatio || 1;
  sizeCanvasForDpr(canvas, ctx, model.scene.width, model.scene.height, dpr);
  const resolve = cssColorResolver(canvas);
  let batches = 0;
  for (const stratum of strata) {
    if (stratum.backend !== "canvas") continue;
    drawStratum(ctx, model.scene, stratum.batches, resolve);
    batches += stratum.batches.length;
  }
  return { markHint: batches };
}

export function bundleScatterCanvas(data: ScatterColumns): unknown {
  return runPipeline(scatterSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}

export function bundleLineCanvas(data: SeriesColumns): unknown {
  return runPipeline(lineSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}

export function bundleAreaCanvas(data: SeriesColumns): unknown {
  return runPipeline(areaSpec(data), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
}
