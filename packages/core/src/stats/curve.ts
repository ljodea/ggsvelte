/**
 * geom_curve tessellation (#794): quadratic Bezier from endpoints +
 * curvature/angle control offset. Clean-room public contract (radians-free
 * angle in degrees, matching ggplot2's angle param naming).
 *
 * Callers must pass endpoints in a space where x and y share units (panel px
 * after independent axis scaling) so curvature is not aspect-skewed.
 *
 * Sign convention: positive curvature bows to the right of the start→end
 * direction when angle = 90 (perpendicular control).
 *
 * ncp is a density knob: sampleCount = max(8, ncp * 8). It is NOT a true
 * multi-control xspline count (intentional v1 subset).
 */

export interface CurveTessellateInput {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Amount of bend; 0 = straight. ggplot2 default 0.5. */
  readonly curvature: number;
  /** Control direction relative to the chord, in degrees. ggplot2 default 90. */
  readonly angle: number;
  /** Smoothness density knob (ggplot2 ncp; maps to sample count). Default 5. */
  readonly ncp: number;
}

export interface CurveTessellateResult {
  /** Interleaved x,y samples including both endpoints. */
  readonly positions: Float64Array;
  /** Number of (x,y) samples. */
  readonly count: number;
}

export function curveSampleCount(ncp: number): number {
  const n = Number.isFinite(ncp) && ncp >= 1 ? Math.floor(ncp) : 5;
  return Math.max(8, n * 8);
}

/**
 * Quadratic Bezier: P0 → P2 via control C offset from the midpoint.
 * C = midpoint + curvature · |chord| · unit(chord rotated by angle°).
 */
export function tessellateCurve(input: CurveTessellateInput): CurveTessellateResult {
  const { x0, y0, x1, y1 } = input;
  const curvature = Number.isFinite(input.curvature) ? input.curvature : 0.5;
  const angleDeg = Number.isFinite(input.angle) ? input.angle : 90;
  const count = curveSampleCount(input.ncp);

  if (
    !Number.isFinite(x0) ||
    !Number.isFinite(y0) ||
    !Number.isFinite(x1) ||
    !Number.isFinite(y1)
  ) {
    const positions = new Float64Array(4);
    positions[0] = x0;
    positions[1] = y0;
    positions[2] = x1;
    positions[3] = y1;
    return { positions, count: 2 };
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  let cx: number;
  let cy: number;
  if (len < 1e-12 || curvature === 0) {
    // Degenerate / straight: samples along the chord.
    cx = (x0 + x1) / 2;
    cy = (y0 + y1) / 2;
  } else {
    const ux = dx / len;
    const uy = dy / len;
    const rad = (angleDeg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    // Rotate unit chord by angle° (90° → left-hand perpendicular when
    // screen y increases downward… callers use plot px with y-down already).
    const rx = ux * cosA - uy * sinA;
    const ry = ux * sinA + uy * cosA;
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;
    cx = midX + curvature * len * rx;
    cy = midY + curvature * len * ry;
  }

  const positions = new Float64Array(count * 2);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const u = 1 - t;
    // Quadratic Bezier B(t) = (1-t)² P0 + 2(1-t)t C + t² P1
    positions[i * 2] = u * u * x0 + 2 * u * t * cx + t * t * x1;
    positions[i * 2 + 1] = u * u * y0 + 2 * u * t * cy + t * t * y1;
  }
  return { positions, count };
}
