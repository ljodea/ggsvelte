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

/** Synthetic corners between (prevX,prevY) and (x,y), excluding the endpoint. */
export function stepCorners(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  curve: PathStepCurve,
): readonly { x: number; y: number }[] {
  if (curve === "step-hv") {
    return [{ x, y: prevY }];
  }
  if (curve === "step-vh") {
    return [{ x: prevX, y }];
  }
  // mid
  const mid = (prevX + x) / 2;
  return [
    { x: mid, y: prevY },
    { x: mid, y },
  ];
}

/** Max synthetic vertices per authored segment for tessellation budgeting. */
export function stepCornersPerSegment(curve: PathStepCurve): number {
  return curve === "step" ? 2 : 1;
}
