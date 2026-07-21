import type { RenderModel } from "@ggsvelte/core";

export type PlotRect = {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
};

export type PanelCoordInverse = {
  readonly x: { invertFraction(fraction: number): number };
  readonly y: { invertFraction(fraction: number): number };
};

export type PanelCoordProjection = {
  readonly x: {
    invertFraction(fraction: number): number;
    projectFraction(fraction: number): number;
  };
  readonly y: {
    invertFraction(fraction: number): number;
    projectFraction(fraction: number): number;
  };
};

export type PanelBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * First panel whose inclusive pixel bounds contain the anchor, or null.
 * Matches host inspection-panel resolution (`>=` / `<=` on each edge).
 */
export function panelContainingAnchor<T extends PanelBounds>(
  panels: readonly T[],
  anchor: { readonly x: number; readonly y: number },
): T | null {
  return (
    panels.find(
      (panel) =>
        anchor.x >= panel.x &&
        anchor.x <= panel.x + panel.width &&
        anchor.y >= panel.y &&
        anchor.y <= panel.y + panel.height,
    ) ?? null
  );
}

/** Continuous zoom domain bag used by brush-to-zoom commit paths. */
export type ContinuousZoomDomains = {
  x?: [number, number];
  y?: [number, number];
};

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

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

export function frozenZoomDomains(domains: ContinuousZoomDomains): ContinuousZoomDomains {
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
  coord?: PanelCoordInverse,
): { x?: [number, number]; y?: [number, number] } {
  const screenTx0 = clamp((rect.x0 - panel.x) / panel.width, 0, 1);
  const screenTx1 = clamp((rect.x1 - panel.x) / panel.width, 0, 1);
  const screenTy0 = clamp(1 - (rect.y1 - panel.y) / panel.height, 0, 1);
  const screenTy1 = clamp(1 - (rect.y0 - panel.y) / panel.height, 0, 1);
  const tx0 = coord?.x.invertFraction(screenTx0) ?? screenTx0;
  const tx1 = coord?.x.invertFraction(screenTx1) ?? screenTx1;
  const ty0 = coord?.y.invertFraction(screenTy0) ?? screenTy0;
  const ty1 = coord?.y.invertFraction(screenTy1) ?? screenTy1;
  const horizontalDomain = invertedDomain(flipped ? scales.y : scales.x, tx0, tx1);
  const verticalDomain = invertedDomain(flipped ? scales.x : scales.y, ty0, ty1);
  const xDomain = flipped ? verticalDomain : horizontalDomain;
  const yDomain = flipped ? horizontalDomain : verticalDomain;
  return {
    ...(xDomain !== undefined && { x: xDomain }),
    ...(yDomain !== undefined && { y: yDomain }),
  };
}

export type IntervalSelectMode = "x" | "y" | "xy";

/**
 * Expand a brush rect to the free axis for interval selection.
 * Under coord flip, x-mode expands the horizontal panel span and y-mode the
 * vertical span (channels are swapped relative to unflipped). Absent panels
 * leave the rect unchanged.
 */
export function expandIntervalQuery(
  rect: PlotRect,
  panel: PanelBounds | undefined,
  mode: IntervalSelectMode,
  flipped: boolean,
): PlotRect {
  if (panel === undefined) return rect;
  if (mode === "x") {
    return flipped
      ? { ...rect, x0: panel.x, x1: panel.x + panel.width }
      : { ...rect, y0: panel.y, y1: panel.y + panel.height };
  }
  if (mode === "y") {
    return flipped
      ? { ...rect, y0: panel.y, y1: panel.y + panel.height }
      : { ...rect, x0: panel.x, x1: panel.x + panel.width };
  }
  return rect;
}
