/**
 * Step-line corner insertion for SVG/canvas path emission and coord projection.
 * - step (mid): corner at midpoint x (line curve:"step")
 * - step-hv: horizontal then vertical (ggplot2 geom_step direction "hv"; ECDF-correct)
 * - step-vh: vertical then horizontal
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
  if (curve === "step-hv") return [{ x, y: prevY }];
  if (curve === "step-vh") return [{ x: prevX, y }];
  const mid = (prevX + x) / 2;
  return [
    { x: mid, y: prevY },
    { x: mid, y },
  ];
}

export function stepCornersPerSegment(curve: PathStepCurve): number {
  return curve === "step" ? 2 : 1;
}
