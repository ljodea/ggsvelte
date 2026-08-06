import type {
  CoordFixedSpec,
  CoordRadialSpec,
  CoordSfSpec,
  CoordSpec,
  CoordTransformAxisSpec,
  CoordTransformSpec,
} from "./schema.js";

export type CoordTransformName = CoordTransformAxisSpec["transform"];

export type CoordTransformAxisOptions = Omit<CoordTransformAxisSpec, "transform"> & {
  /** Post-stat coordinate transform (default identity). */
  transform?: CoordTransformName;
};

export interface CoordTransformOptions {
  x?: CoordTransformName | CoordTransformAxisOptions;
  y?: CoordTransformName | CoordTransformAxisOptions;
  clip?: boolean;
}

function axis(
  value: CoordTransformName | CoordTransformAxisOptions | undefined,
): CoordTransformAxisSpec | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return { transform: value };
  return { ...value, transform: value.transform ?? "identity" };
}

/**
 * Build a canonical post-stat coordinate transform. With no effective options,
 * returns the canonical Cartesian coordinate object (normalize() removes it).
 */
export function coordTransform(options: CoordTransformOptions = {}): CoordSpec {
  const x = axis(options.x);
  const y = axis(options.y);
  const effective = x !== undefined || y !== undefined || options.clip === false;
  if (!effective) return { type: "cartesian" };
  return {
    type: "transform",
    ...(x !== undefined && { x }),
    ...(y !== undefined && { y }),
    ...(options.clip !== undefined && { clip: options.clip }),
  } satisfies CoordTransformSpec;
}

/** ggplot2-style alias for coordTransform(). */
export const coord_transform = coordTransform;

export interface CoordFixedOptions {
  /** Physical y-unit length divided by physical x-unit length (default 1). */
  ratio?: number;
}

/** Build a canonical fixed-aspect Cartesian coordinate configuration. */
export function coordFixed(options: CoordFixedOptions = {}): CoordFixedSpec {
  return {
    type: "fixed",
    ...(options.ratio !== undefined && options.ratio !== 1 && { ratio: options.ratio }),
  };
}

/** Equal-unit spelling of coordFixed(); accepts ratio for exact alias parity. */
export const coordEqual = coordFixed;
/** ggplot2-style aliases over the same implementation. */
export const coord_fixed = coordFixed;
export const coord_equal = coordEqual;

export interface CoordSfOptions {
  /**
   * Physical y-unit length / x-unit length (default 1). Use 1 for equal
   * projected metres; set explicitly for lon/lat display corrections.
   */
  ratio?: number;
}

/**
 * Fixed-aspect coordinates for already-projected geom_sf maps (ggplot2
 * `coord_sf` subset). No CRS transform or graticules in v1 — data must
 * already be in plot space (#809 phase 8).
 */
export function coordSf(options: CoordSfOptions = {}): CoordSfSpec {
  return {
    type: "sf",
    ...(options.ratio !== undefined && options.ratio !== 1 && { ratio: options.ratio }),
  };
}

/** ggplot2-style alias for coordSf(). */
export const coord_sf = coordSf;

export type CoordRadialTheta = "x" | "y";
export type CoordRadialReverse = "none" | "theta" | "r" | "thetar";

export interface CoordRadialOptions {
  /** Aesthetic mapped to angle (`x` default; `y` for pie charts). */
  theta?: CoordRadialTheta;
  /** Offset from 12 o'clock in radians (default 0). */
  start?: number;
  /** End angle from 12 o'clock in radians (default start + 2π). */
  end?: number;
  /** Inner hole radius as a fraction of the outer radius (0–1, default 0). */
  innerRadius?: number;
  /** Expand scale limits slightly (default true). Set false for pie/coxcomb. */
  expand?: boolean;
  /**
   * Clip marks to the panel. ggplot2 `coord_radial` defaults off; `coord_polar`
   * defaults on. Omitted means off for `coordRadial`.
   */
  clip?: boolean;
  /** Reverse theta, r, both (`thetar`), or neither (default `"none"`). */
  reverse?: CoordRadialReverse;
  /** Semantic limits for the theta aesthetic. */
  thetaLimits?: readonly [number, number];
  /** Semantic limits for the radius aesthetic. */
  rLimits?: readonly [number, number];
}

/**
 * Build canonical polar/radial coordinates (ggplot2 `coord_radial`).
 * Defaults match ggplot2: theta = x, start = 0, full circle, expand true,
 * clip off, reverse none, no inner hole.
 */
export function coordRadial(options: CoordRadialOptions = {}): CoordRadialSpec {
  const { theta, start, end, innerRadius, expand, clip, reverse, thetaLimits, rLimits } = options;
  return {
    type: "radial",
    ...(theta !== undefined && theta !== "x" && { theta }),
    ...(start !== undefined && start !== 0 && { start }),
    ...(end !== undefined && { end }),
    ...(innerRadius !== undefined && innerRadius !== 0 && { innerRadius }),
    ...(expand === false && { expand: false }),
    ...(clip === true && { clip: true }),
    ...(reverse !== undefined && reverse !== "none" && { reverse }),
    ...(thetaLimits !== undefined && { thetaLimits: [thetaLimits[0], thetaLimits[1]] }),
    ...(rLimits !== undefined && { rLimits: [rLimits[0], rLimits[1]] }),
  };
}

/** ggplot2-style alias for coordRadial(). */
export const coord_radial = coordRadial;

export interface CoordPolarOptions {
  /** Aesthetic mapped to angle (`x` default; `y` for pie charts). */
  theta?: CoordRadialTheta;
  /** Offset from 12 o'clock in radians (default 0). */
  start?: number;
  /**
   * 1 = clockwise (default), -1 = anticlockwise. Maps to `reverse: "theta"`
   * when -1 (ggplot2 coord_polar; superseded by coord_radial reverse).
   */
  direction?: 1 | -1;
  /**
   * Clip marks to the panel. ggplot2 coord_polar defaults on; the radial
   * portable form stores `clip: true` for that default.
   */
  clip?: boolean;
}

/**
 * ggplot2 `coord_polar` alias — superseded by `coord_radial` but kept for
 * parity. Emits `{ type: "radial", … }` with polar defaults (clip on;
 * direction -1 → reverse theta). Partial arcs / inner radius use coordRadial.
 */
export function coordPolar(options: CoordPolarOptions = {}): CoordRadialSpec {
  const { theta, start, direction, clip } = options;
  return coordRadial({
    ...(theta !== undefined && { theta }),
    ...(start !== undefined && { start }),
    clip: clip !== false,
    ...(direction === -1 && { reverse: "theta" }),
  });
}

/** ggplot2-style alias for coordPolar(). */
export const coord_polar = coordPolar;
