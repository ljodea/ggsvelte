/**
 * Polar / radial coordinate projector (ggplot2 coord_radial transform algebra).
 *
 * Unit-square form matches ggplot2:
 *   r ∈ [inner*0.4, 0.4], theta along [start, end]
 *   x = 0.5 + r * sin(theta)
 *   y = 0.5 + r * cos(theta)   (y-up data space; 0 at 12 o'clock)
 *
 * Panel pixels flip y so screen y increases downward.
 */

export type PolarTheta = "x" | "y";
export type PolarReverse = "none" | "theta" | "r" | "thetar";

export interface PolarProjectorConfig {
  theta?: PolarTheta;
  start?: number;
  end?: number;
  innerRadius?: number;
  reverse?: PolarReverse;
}

export interface PolarBBox {
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
}

export interface PolarProjector {
  readonly kind: "polar";
  readonly theta: PolarTheta;
  /** Inclusive arc endpoints in radians (after reverse). */
  readonly arc: readonly [number, number];
  /** Inclusive radius band in unit-square radii (after reverse). */
  readonly radius: readonly [number, number];
  readonly bbox: PolarBBox;
  readonly reverse: PolarReverse;
}

const OUTER = 0.4;

/** ggplot2 polar_bbox for full and partial arcs. */
export function polarBBox(
  arc: readonly [number, number],
  radius: readonly [number, number] = [0, OUTER],
  margin: readonly [number, number, number, number] = [0.05, 0.05, 0.05, 0.05],
): PolarBBox {
  if (Math.abs(arc[1] - arc[0]) >= 2 * Math.PI - 1e-12) {
    return { x: [0, 1], y: [0, 1] };
  }
  const a0 = Math.min(arc[0], arc[1]);
  const a1 = Math.max(arc[0], arc[1]);
  const r0 = Math.min(radius[0], radius[1]);
  const r1 = Math.max(radius[0], radius[1]);

  const xs: number[] = [];
  const ys: number[] = [];
  for (const a of [a0, a1]) {
    xs.push(0.5 + r1 * Math.sin(a), 0.5 + r0 * Math.sin(a));
    ys.push(0.5 + r1 * Math.cos(a), 0.5 + r0 * Math.cos(a));
  }
  // Sample cardinal directions that fall inside the arc
  for (const a of [0, 0.5 * Math.PI, Math.PI, 1.5 * Math.PI]) {
    if (inArc(a, [a0, a1])) {
      xs.push(0.5 + r1 * Math.sin(a));
      ys.push(0.5 + r1 * Math.cos(a));
    }
  }

  let xmin = Math.min(...xs);
  let xmax = Math.max(...xs);
  let ymin = Math.min(...ys);
  let ymax = Math.max(...ys);

  // Margins on shortened edges (ggplot polar_bbox). Cardinals: top, right,
  // bottom, left. When a cardinal sits inside the arc, lock that side to the
  // unit edge; otherwise pad the shortened side.
  const topIn = inArc(0, [a0, a1]);
  const rightIn = inArc(0.5 * Math.PI, [a0, a1]);
  const bottomIn = inArc(Math.PI, [a0, a1]);
  const leftIn = inArc(1.5 * Math.PI, [a0, a1]);
  if (topIn) ymax = 1;
  else ymax = Math.min(1, ymax + margin[0]);
  if (rightIn) xmax = 1;
  else xmax = Math.min(1, xmax + margin[1]);
  if (bottomIn) ymin = 0;
  else ymin = Math.max(0, ymin - margin[2]);
  if (leftIn) xmin = 0;
  else xmin = Math.max(0, xmin - margin[3]);

  return { x: [xmin, xmax], y: [ymin, ymax] };
}

function inArc(theta: number, arc: readonly [number, number]): boolean {
  if (Math.abs(arc[1] - arc[0]) > 2 * Math.PI - Math.sqrt(Number.EPSILON)) return true;
  const twoPi = 2 * Math.PI;
  let a0 = ((arc[0] % twoPi) + twoPi) % twoPi;
  let a1 = ((arc[1] % twoPi) + twoPi) % twoPi;
  let t = ((theta % twoPi) + twoPi) % twoPi;
  if (a0 < a1) return t >= a0 && t <= a1;
  return !(t < a0 && t > a1);
}

export function buildPolarProjector(config: PolarProjectorConfig = {}): PolarProjector {
  const theta: PolarTheta = config.theta === "y" ? "y" : "x";
  const start = config.start ?? 0;
  let end = config.end ?? start + 2 * Math.PI;
  // ggplot normalizes when start > end by rotating down by full turns
  if (start > end) {
    const nRotate = Math.floor((start - end) / (2 * Math.PI)) + 1;
    // keep start, shift... actually ggplot adjusts arc[1] relative:
    // n_rotate <- ((arc[1]-arc[2]) %/% (2*pi)) + 1; arc[1] <- arc[1] - n_rotate * 2*pi
    // wait arc is c(start, end), and if arc[1] > arc[2]:
    const adjustedStart = start - nRotate * 2 * Math.PI;
    let arc: [number, number] = [adjustedStart, end];
    const reverse = config.reverse ?? "none";
    if (reverse === "theta" || reverse === "thetar") arc = [arc[1], arc[0]];
    const inner = config.innerRadius ?? 0;
    let radius: [number, number] = [inner * OUTER, OUTER];
    if (reverse === "r" || reverse === "thetar") radius = [radius[1], radius[0]];
    return {
      kind: "polar",
      theta,
      arc,
      radius,
      bbox: polarBBox(arc, radius),
      reverse,
    };
  }

  let arc: [number, number] = [start, end];
  const reverse = config.reverse ?? "none";
  if (reverse === "theta" || reverse === "thetar") arc = [arc[1], arc[0]];
  const inner = config.innerRadius ?? 0;
  let radius: [number, number] = [inner * OUTER, OUTER];
  if (reverse === "r" || reverse === "thetar") radius = [radius[1], radius[0]];
  return {
    kind: "polar",
    theta,
    arc,
    radius,
    bbox: polarBBox(arc, radius),
    reverse,
  };
}

/**
 * Project scale-normalized fractions into panel pixels.
 * `xFrac` / `yFrac` are [0, 1] in data orientation (y up: 0 = bottom).
 */
export function polarProject(
  projector: PolarProjector,
  xFrac: number,
  yFrac: number,
  width: number,
  height: number,
): readonly [number, number] {
  const [thetaFrac, rFrac] = projector.theta === "x" ? [xFrac, yFrac] : [yFrac, xFrac];
  const [a0, a1] = projector.arc;
  const [r0, r1] = projector.radius;
  const th = a0 + thetaFrac * (a1 - a0);
  const r = r0 + rFrac * (r1 - r0);
  const ux = 0.5 + r * Math.sin(th);
  const uy = 0.5 + r * Math.cos(th); // y-up unit square
  const [bx0, bx1] = projector.bbox.x;
  const [by0, by1] = projector.bbox.y;
  const nx = bx1 === bx0 ? 0.5 : (ux - bx0) / (bx1 - bx0);
  const ny = by1 === by0 ? 0.5 : (uy - by0) / (by1 - by0);
  return [nx * width, (1 - ny) * height];
}

/**
 * Inverse of polarProject: panel pixels → data-oriented fractions (y up).
 */
export function polarUnproject(
  projector: PolarProjector,
  x: number,
  y: number,
  width: number,
  height: number,
): readonly [number, number] {
  const [bx0, bx1] = projector.bbox.x;
  const [by0, by1] = projector.bbox.y;
  const nx = width === 0 ? 0.5 : x / width;
  const ny = height === 0 ? 0.5 : 1 - y / height;
  const ux = bx0 + nx * (bx1 - bx0);
  const uy = by0 + ny * (by1 - by0);
  const dx = ux - 0.5;
  const dy = uy - 0.5;
  let th = Math.atan2(dx, dy); // atan2(x, y) so 0 is up
  if (th < 0) th += 2 * Math.PI;
  const r = Math.hypot(dx, dy);
  const [a0, a1] = projector.arc;
  const [r0, r1] = projector.radius;
  // Unwrap th into the arc span so start offsets and reverse arcs invert.
  const span = a1 - a0;
  let rel = th - a0;
  if (span > 0) {
    while (rel < 0) rel += 2 * Math.PI;
    while (rel > span && rel - 2 * Math.PI >= 0) rel -= 2 * Math.PI;
  } else if (span < 0) {
    while (rel > 0) rel -= 2 * Math.PI;
    while (rel < span && rel + 2 * Math.PI <= 0) rel += 2 * Math.PI;
  }
  const thetaFrac = span === 0 ? 0.5 : rel / span;
  const rFrac = r1 === r0 ? 0.5 : (r - r0) / (r1 - r0);
  if (projector.theta === "x") return [thetaFrac, rFrac];
  return [rFrac, thetaFrac];
}

/** Project panel pixels (already scale-mapped, y-down) through polar. */
export function polarProjectPanelPoint(
  projector: PolarProjector,
  x: number,
  y: number,
  width: number,
  height: number,
): readonly [number, number] {
  const xFrac = width === 0 ? 0.5 : x / width;
  const yFrac = height === 0 ? 0.5 : 1 - y / height; // to y-up
  return polarProject(projector, xFrac, yFrac, width, height);
}
