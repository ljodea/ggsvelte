/**
 * Canvas-mark ggsvelte mounts (pipeline + planStrata + drawStratum).
 * All imports stay on the lean graph (@ggsvelte/core/render + /dom) so canvas
 * charts never install the Temporal polyfill.
 */
import { cssColorResolver, drawStratum, sizeCanvasForDpr } from "@ggsvelte/core/dom";
import { planStrata, runPipeline } from "@ggsvelte/core/render";
import { aes, gg } from "@ggsvelte/spec/portable";

import {
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

export type UpdateColumns = ScatterColumns | SeriesColumns;

export type MountHandle = {
  destroy: () => void;
  update: (data: UpdateColumns) => void;
};

export type MountResult = { markHint: number; handle: MountHandle };

/** Marks-only harness: no legend layout (axes also undrawn — see mount). */
const marksOnly = { legend: { position: "none" as const } };

function scatterSpec(data: ScatterColumns) {
  return gg(data, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7, render: "canvas" })
    .theme(marksOnly)
    .toPortable();
}

function lineSpec(data: SeriesColumns) {
  return gg(data, aes({ x: "x", y: "y", color: "series", group: "series" }))
    .geomLine({ render: "canvas" })
    .theme(marksOnly)
    .toPortable();
}

function areaSpec(data: SeriesColumns) {
  // Identity (not stack): competitors overlay series; default geomArea is stack.
  return gg(data, aes({ x: "x", y: "y", fill: "series", group: "series" }))
    .geomArea({ position: "identity", render: "canvas" })
    .theme(marksOnly)
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
  const specFor = (d: UpdateColumns) => {
    switch (scenario) {
      case "scatter-color":
        return scatterSpec(d as ScatterColumns);
      case "line-multiseries":
        return lineSpec(d as SeriesColumns);
      case "area-multiseries":
        return areaSpec(d as SeriesColumns);
      default:
        throw new Error(`unsupported canvas scenario ${scenario}`);
    }
  };
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
  const resolve = cssColorResolver(canvas);
  let sized = false;
  const draw = (d: UpdateColumns): number => {
    const model = runPipeline(specFor(d), { width: PLOT_WIDTH, height: PLOT_HEIGHT });
    const strata = planStrata(model.scene, model.layerBackends);
    if (!sized) {
      sizeCanvasForDpr(canvas, ctx, model.scene.width, model.scene.height, dpr);
      sized = true;
    } else {
      // Same canvas element on updates: clear the frame (logical coords — the
      // dpr transform set by sizeCanvasForDpr persists) and redraw.
      ctx.clearRect(0, 0, model.scene.width, model.scene.height);
    }
    let batches = 0;
    for (const stratum of strata) {
      if (stratum.backend !== "canvas") continue;
      drawStratum(ctx, model.scene, stratum.batches, resolve);
      batches += stratum.batches.length;
    }
    return batches;
  };
  const markHint = draw(data);
  return {
    markHint,
    handle: {
      // Full pipeline re-run on the SAME canvas element — ggsvelte's lean
      // canvas path has no incremental redraw, so update == remount-minus-DOM.
      update: (d) => {
        draw(d);
      },
      destroy: () => {
        root.replaceChildren();
      },
    },
  };
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
