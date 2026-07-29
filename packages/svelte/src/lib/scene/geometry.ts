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

/** Convert viewport `PlotRect` bounds into the xywh shape keyboard/clamp callers use. */
export function panelBoundsFrom(rect: PlotRect): PanelBounds {
  return {
    x: rect.x0,
    y: rect.y0,
    width: rect.x1 - rect.x0,
    height: rect.y1 - rect.y0,
  };
}

/** Continuous zoom domain bag used by brush-to-zoom commit paths. */
export type ContinuousZoomDomains = {
  x?: [number, number];
  y?: [number, number];
};

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

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
 * CSS-px radius of the inspection hover ring (`.gg-hover-ring`).
 * Keep in sync with InteractionOverlay.
 */
export const HOVER_RING_RADIUS = 6;

/**
 * Half-width of the empty focus hole around the inspected anchor.
 * Must clear the hover ring (r=6) plus ring stroke (1.5) so guides never
 * paint through the focused mark under the halo.
 */
export const HOVER_CROSSHAIR_GAP_RADIUS = 8;

export type CrosshairSegment = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

/**
 * Panel-spanning axis guide broken into segments that leave a circular gap
 * around the focus anchor. `gapRadius <= 0` yields one continuous segment
 * (rect hover chrome with no ring).
 */
export function gappedCrosshairSegments(
  axis: "vertical" | "horizontal",
  focus: { readonly x: number; readonly y: number },
  panel: PanelBounds,
  gapRadius: number,
): readonly CrosshairSegment[] {
  const panelBottom = panel.y + panel.height;
  const panelRight = panel.x + panel.width;

  if (!(gapRadius > 0)) {
    return axis === "vertical"
      ? [{ x1: focus.x, y1: panel.y, x2: focus.x, y2: panelBottom }]
      : [{ x1: panel.x, y1: focus.y, x2: panelRight, y2: focus.y }];
  }

  const segments: CrosshairSegment[] = [];
  if (axis === "vertical") {
    const gapTop = focus.y - gapRadius;
    const gapBottom = focus.y + gapRadius;
    if (gapTop > panel.y) {
      segments.push({ x1: focus.x, y1: panel.y, x2: focus.x, y2: gapTop });
    }
    if (gapBottom < panelBottom) {
      segments.push({
        x1: focus.x,
        y1: gapBottom,
        x2: focus.x,
        y2: panelBottom,
      });
    }
    return segments;
  }

  const gapLeft = focus.x - gapRadius;
  const gapRight = focus.x + gapRadius;
  if (gapLeft > panel.x) {
    segments.push({ x1: panel.x, y1: focus.y, x2: gapLeft, y2: focus.y });
  }
  if (gapRight < panelRight) {
    segments.push({
      x1: gapRight,
      y1: focus.y,
      x2: panelRight,
      y2: focus.y,
    });
  }
  return segments;
}
