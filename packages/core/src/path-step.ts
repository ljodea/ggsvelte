/**
 * Step-line corner insertion for SVG/canvas path emission and coord projection.
 * Modes:
 * - step (mid): corner at midpoint x (existing line curve:"step")
 * - step-hv: horizontal then vertical (ggplot2 direction "hv")
 * - step-vh: vertical then horizontal (ggplot2 direction "vh")
 */
export type PathStepCurve = "step" | "step-hv" | "step-vh";

export function isStepCurve(curve: string): curve is PathStepCurve {
  return curve === "step" || curve === "step-hv" || curve === "step-vh";
}

/** Most points {@link drawnEdgeInto} writes for one authored edge (step mid). */
export const MAX_DRAWN_EDGE_POINTS = 4;

/**
 * The drawn polyline for one authored edge, written into `out` as x,y pairs
 * including both endpoints. Returns the point count: 2 for a linear edge, 3 for
 * step-hv/step-vh, 4 for step mid.
 *
 * This is the one place that knows what a stepped edge looks like on screen.
 * Renderers and hit testing both read it, so the drawn stroke and the hit
 * region cannot drift apart.
 *
 * `out` must hold at least `MAX_DRAWN_EDGE_POINTS * 2` slots; callers hoist it
 * out of their edge loop so walking a path allocates nothing.
 */
export function drawnEdgeInto(
  out: number[],
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  curve: string,
): number {
  out[0] = prevX;
  out[1] = prevY;
  let points = 1;
  if (curve === "step-hv") {
    out[2] = x;
    out[3] = prevY;
    points = 2;
  } else if (curve === "step-vh") {
    out[2] = prevX;
    out[3] = y;
    points = 2;
  } else if (curve === "step") {
    const mid = (prevX + x) / 2;
    out[2] = mid;
    out[3] = prevY;
    out[4] = mid;
    out[5] = y;
    points = 3;
  }
  out[points * 2] = x;
  out[points * 2 + 1] = y;
  return points + 1;
}

/** Synthetic corners between (prevX,prevY) and (x,y), excluding the endpoint. */
export function stepCorners(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  curve: PathStepCurve,
): readonly { x: number; y: number }[] {
  const drawn: number[] = [];
  const points = drawnEdgeInto(drawn, prevX, prevY, x, y, curve);
  const corners: { x: number; y: number }[] = [];
  for (let point = 1; point < points - 1; point++) {
    corners.push({ x: drawn[point * 2]!, y: drawn[point * 2 + 1]! });
  }
  return corners;
}

/** Max synthetic vertices per authored segment for tessellation budgeting. */
export function stepCornersPerSegment(curve: PathStepCurve): number {
  return curve === "step" ? 2 : 1;
}
