import { clamp, normalizedRect, type PanelBounds, type PlotRect } from "../scene/geometry.js";
import { isBrushTooSmall } from "../interval/interval.js";

/** Live brush corners; may be denormalized while dragging (x0>x1 or y0>y1). */
export type BrushCorners = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type PlotPoint = Readonly<{ x: number; y: number }>;

/** Degenerate brush at a single point (pointer-down / first keyboard corner). */
export function brushAtPoint(point: PlotPoint): BrushCorners {
  return { x0: point.x, y0: point.y, x1: point.x, y1: point.y };
}

/** Update the free corner of a brush (pointer move / second-corner down). */
export function brushWithEnd(corners: BrushCorners, point: PlotPoint): BrushCorners {
  return { ...corners, x1: point.x, y1: point.y };
}

/**
 * Pointer-down begin-area corners.
 * Extend free corner only when reducer is awaiting second AND draft exists;
 * otherwise start a degenerate brush at `point`. Both conditions are required
 * so a surviving draft without first-corner state restarts fresh (not extend).
 */
export function initialBrushRect(input: {
  readonly areaAwaitingSecond: boolean;
  readonly existing: BrushCorners | null;
  readonly point: PlotPoint;
}): BrushCorners {
  return input.areaAwaitingSecond && input.existing !== null
    ? brushWithEnd(input.existing, input.point)
    : brushAtPoint(input.point);
}

/**
 * Keyboard arrow nudge of the free corner, clamped to panel bounds.
 * Does not normalize; callers keep denormalized corners until commit.
 */
export function nudgeBrushEnd(
  corners: BrushCorners,
  dx: number,
  dy: number,
  panel: PanelBounds,
): BrushCorners {
  return {
    ...corners,
    x1: clamp(corners.x1 + dx, panel.x, panel.x + panel.width),
    y1: clamp(corners.y1 + dy, panel.y, panel.y + panel.height),
  };
}

/**
 * Pointer brush-end evaluation.
 * Too-small: BOTH spans &lt; min (see isBrushTooSmall); returns normalized corners
 * for the retained draft (matches existing GGPlot behavior).
 * Otherwise returns a normalized commit rect.
 */
export type PointerBrushEnd =
  | { readonly kind: "too-small"; readonly corners: PlotRect }
  | { readonly kind: "commit"; readonly rect: PlotRect };

export function evaluatePointerBrushEnd(
  corners: BrushCorners,
  endPoint: PlotPoint,
): PointerBrushEnd {
  const rect = normalizedRect(brushWithEnd(corners, endPoint));
  if (isBrushTooSmall(rect)) return { kind: "too-small", corners: rect };
  return { kind: "commit", rect };
}

/** Panel center for keyboard first-corner placement when no inspection anchor. */
export function panelCenterAnchor(panel: PanelBounds | undefined): PlotPoint {
  if (panel === undefined) return { x: 0, y: 0 };
  return { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
}
