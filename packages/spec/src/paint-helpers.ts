/**
 * Within-mark paint authoring helpers (#591).
 * Closed portable gradients + bounded glow — not theme decoration.
 */
import type {
  ColorStop,
  GlowSpec,
  LinearGradientPaint,
  PaintSpace,
  RadialGradientPaint,
} from "./schema.js";

export type ColorStopInput = ColorStop;

export type LinearPaintOptions = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Gradient coordinate space. Default "mark" (object bounding box). */
  space?: PaintSpace;
  stops: ColorStopInput[];
  /** Required solid #rgb/#rrggbb fallback for a11y / reduced-effects paths. */
  fallback: string;
};

export type RadialPaintOptions = {
  cx: number;
  cy: number;
  r: number;
  /** Gradient coordinate space. Default "mark" (object bounding box). */
  space?: PaintSpace;
  stops: ColorStopInput[];
  /** Required solid #rgb/#rrggbb fallback for a11y / reduced-effects paths. */
  fallback: string;
};

export type GlowOptions = {
  color: string;
  /** Blur radius in CSS px (exclusive minimum 0, maximum 32). */
  radius: number;
  /** Glow opacity 0–1. */
  opacity: number;
};

function linear(options: LinearPaintOptions): LinearGradientPaint {
  return {
    type: "linear",
    x1: options.x1,
    y1: options.y1,
    x2: options.x2,
    y2: options.y2,
    space: options.space ?? "mark",
    stops: options.stops.map((stop) => ({ ...stop })),
    fallback: options.fallback,
  };
}

function radial(options: RadialPaintOptions): RadialGradientPaint {
  return {
    type: "radial",
    cx: options.cx,
    cy: options.cy,
    r: options.r,
    space: options.space ?? "mark",
    stops: options.stops.map((stop) => ({ ...stop })),
    fallback: options.fallback,
  };
}

/** Build a deterministic linear gradient paint for fillPaint / strokePaint. */
export function fillPaintLinear(options: LinearPaintOptions): LinearGradientPaint {
  return linear(options);
}

/** Build a deterministic radial gradient paint for fillPaint. */
export function fillPaintRadial(options: RadialPaintOptions): RadialGradientPaint {
  return radial(options);
}

/** Build a deterministic linear gradient paint for strokePaint. */
export function strokePaintLinear(options: LinearPaintOptions): LinearGradientPaint {
  return linear(options);
}

/** Build a deterministic radial gradient paint for strokePaint. */
export function strokePaintRadial(options: RadialPaintOptions): RadialGradientPaint {
  return radial(options);
}

/** Build a bounded glow treatment (color, radius ≤ 32px, opacity). */
export function glow(options: GlowOptions): GlowSpec {
  return {
    color: options.color,
    radius: options.radius,
    opacity: options.opacity,
  };
}
