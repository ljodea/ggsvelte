import type { CoordSpec, CoordTransformAxisSpec, CoordTransformSpec } from "./schema.js";

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
