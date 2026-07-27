/**
 * geom_spoke endpoint math (#810): xend/yend from origin + angle + radius.
 * Angle in radians (ggplot2). Endpoints are computed in **data/semantic**
 * space; callers apply the same position transform as x/y afterward.
 */

export interface SpokeEndpointInput {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly radius: number;
}

export interface SpokeEndpoint {
  readonly xend: number;
  readonly yend: number;
}

/** One spoke tip: (x,y) + radius·(cos θ, sin θ). NaN in → NaN out. */
export function spokeEndpoint(input: SpokeEndpointInput): SpokeEndpoint {
  const { x, y, angle, radius } = input;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(angle) ||
    !Number.isFinite(radius)
  ) {
    return { xend: Number.NaN, yend: Number.NaN };
  }
  return {
    xend: x + radius * Math.cos(angle),
    yend: y + radius * Math.sin(angle),
  };
}

/** Vectorized spoke endpoints (parallel arrays, same length). */
export function spokeEndpoints(
  x: Float64Array,
  y: Float64Array,
  angle: Float64Array,
  radius: Float64Array,
): { xend: Float64Array; yend: Float64Array } {
  const n = x.length;
  const xend = new Float64Array(n);
  const yend = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const tip = spokeEndpoint({
      x: x[i]!,
      y: y[i]!,
      angle: angle[i]!,
      radius: radius[i]!,
    });
    xend[i] = tip.xend;
    yend[i] = tip.yend;
  }
  return { xend, yend };
}
