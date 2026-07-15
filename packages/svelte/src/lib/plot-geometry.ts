import type { RenderModel } from "@ggsvelte/core";

import type { ZoomDomains } from "./interaction.js";

export type PlotRect = {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
};

export type PanelBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** Invert a normalized [t0, t1] window through a positional scale (band
 *  scales cannot zoom — documented M2 limitation). */
export function invertedDomain(
  scale: RenderModel["scales"]["x"],
  t0: number,
  t1: number,
): [number, number] | undefined {
  if (scale.type === "band") return undefined;
  const a = scale.invert(t0);
  const b = scale.invert(t1);
  return a <= b ? [a, b] : [b, a];
}

export function frozenZoomDomains(domains: ZoomDomains): ZoomDomains {
  return Object.freeze({
    ...(domains.x !== undefined && {
      x: Object.freeze([...domains.x]) as unknown as [number, number],
    }),
    ...(domains.y !== undefined && {
      y: Object.freeze([...domains.y]) as unknown as [number, number],
    }),
  });
}

export function normalizedRect(r: PlotRect): PlotRect {
  return {
    x0: Math.min(r.x0, r.x1),
    y0: Math.min(r.y0, r.y1),
    x1: Math.max(r.x0, r.x1),
    y1: Math.max(r.y0, r.y1),
  };
}

/**
 * Shared pixel→data domain inversion used by brush-zoom and interval selection.
 * Returns unfiltered x/y domains in data space (no mode guards, no panel-count
 * guards). Callers apply mode filters and single-panel checks.
 */
export function panelDataDomains(
  rect: PlotRect,
  panel: PanelBounds,
  scales: Pick<RenderModel["scales"], "x" | "y">,
  flipped: boolean,
): { x?: [number, number]; y?: [number, number] } {
  const tx0 = clamp((rect.x0 - panel.x) / panel.width, 0, 1);
  const tx1 = clamp((rect.x1 - panel.x) / panel.width, 0, 1);
  const ty0 = clamp(1 - (rect.y1 - panel.y) / panel.height, 0, 1);
  const ty1 = clamp(1 - (rect.y0 - panel.y) / panel.height, 0, 1);
  const horizontalDomain = invertedDomain(
    flipped ? scales.y : scales.x,
    tx0,
    tx1,
  );
  const verticalDomain = invertedDomain(
    flipped ? scales.x : scales.y,
    ty0,
    ty1,
  );
  const xDomain = flipped ? verticalDomain : horizontalDomain;
  const yDomain = flipped ? horizontalDomain : verticalDomain;
  return {
    ...(xDomain !== undefined && { x: xDomain }),
    ...(yDomain !== undefined && { y: yDomain }),
  };
}
