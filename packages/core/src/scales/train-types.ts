/** Scale interfaces for continuous, band, and ordinal color training. */
import type { PositionTransformName } from "./transform.js";
import type { ScaleState, ScaleWarning } from "./state.js";

export interface ContinuousScale {
  type: "linear" | "time";
  /** Pre-stat transform applied to source values before affine training. */
  transform: PositionTransformName;
  /** Semantic/source-space display domain [min, max] (epoch ms for time). */
  domain: [number, number];
  /** Post-stat scale-space display domain [min, max] (forward(domain)). */
  transformedDomain: [number, number];
  /** Raw finite training extent before nice/display expansion. Coordinate
   * transforms use this when scale expansion crosses their valid domain. */
  evidenceTransformedDomain: [number, number];
  /** Semantic value -> forward -> affine [0, 1]. NaN outside the transform
   *  domain (e.g. non-positive on log10). Reverse is applied here. */
  normalize(value: number): number;
  /** Post-stat scale-space value -> affine [0, 1]. Geometry uses this so a
   *  transformed frame value is never forwarded twice. Reverse applied. */
  normalizeTransformed(value: number): number;
  /** Inverse of normalize: affine [0, 1] -> inverse -> semantic value
   *  (brush-to-zoom inversion). Mirrors reverse. */
  invert(t: number): number;
}

export interface BandScale {
  type: "band";
  /** Presentation labels for categories, parallel to `rawDomain`. */
  domain: readonly string[];
  /** Typed categories: pinned (explicit domain) or present first-seen order. */
  rawDomain: readonly unknown[];
  /** Band index of a value (undefined = not in the domain). */
  indexOf(value: unknown): number | undefined;
  /** Center of a band in [0, 1] (undefined = not in the domain). */
  normalize(value: unknown): number | undefined;
  /** Width of one band step in [0, 1] units. */
  step: number;
}

export type PositionScale = ContinuousScale | BandScale;

export interface ColorScale {
  type: "ordinal";
  /** Present domain values in stable assignment order. */
  domain: readonly unknown[];
  /**
   * Assignment rank of a value (undefined = unknown). O(1) via the training
   * encodeKey map — same keying as `colorOf`, not presentation `bandKey`.
   */
  indexOf(value: unknown): number | undefined;
  /** Resolved color for a value (undefined = unknown). */
  colorOf(value: unknown): string | undefined;
  /** Rendering fallbacks retained separately from unknown lookup semantics. */
  naValue?: string;
  unknownValue?: string;
  /** Serializable value-stable state — commit only for the latest run. */
  state: ScaleState;
  warnings: ScaleWarning[];
}
