/**
 * Coordinate-system canonicalization for normalize() (cartesian/flip/transform/fixed).
 * Scales: normalize-scales.ts. Layer/aes orchestration: normalize.ts.
 */

import type { CoordSpec, CoordTransformAxisSpec, CoordTransformSpec } from "./schema.js";

function normalizeCoordAxis(
  axis: CoordTransformAxisSpec | undefined,
): CoordTransformAxisSpec | undefined {
  if (axis === undefined) return axis;
  const runtimeAxis = axis as unknown;
  if (runtimeAxis === null || typeof runtimeAxis !== "object" || Array.isArray(runtimeAxis))
    return runtimeAxis as CoordTransformAxisSpec;
  // Preserve unknown and malformed runtime values so strict schema validation
  // can reject them; only copy valid tuple-shaped limits defensively.
  const record = runtimeAxis as Record<string, unknown>;
  const normalized = {
    ...record,
    ...(Array.isArray(record["limits"]) && {
      limits: [...(record["limits"] as unknown[])],
    }),
  } as CoordTransformAxisSpec;
  // Drop valid defaults (including explicit undefined from option spreads);
  // preserve malformed non-booleans for schema reject.
  if (record["reverse"] === false || record["reverse"] === undefined) delete normalized.reverse;
  if (record["expand"] === true || record["expand"] === undefined) delete normalized.expand;
  return normalized;
}

function effectiveCoordAxis(axis: ReturnType<typeof normalizeCoordAxis>): boolean {
  if (axis === undefined) return false;
  const runtimeAxis = axis as unknown;
  if (runtimeAxis === null || typeof runtimeAxis !== "object" || Array.isArray(runtimeAxis))
    return true;
  const reverse = (axis as { reverse?: unknown }).reverse;
  const expand = (axis as { expand?: unknown }).expand;
  // Non-boolean reverse/expand must stay effective so schema can reject them.
  const malformedReverse = reverse !== undefined && reverse !== true && reverse !== false;
  const malformedExpand = expand !== undefined && expand !== true && expand !== false;
  return (
    axis.transform !== "identity" ||
    axis.limits !== undefined ||
    axis.reverse === true ||
    axis.expand === false ||
    malformedReverse ||
    malformedExpand ||
    Object.keys(axis).some(
      (key) => key !== "transform" && key !== "limits" && key !== "reverse" && key !== "expand",
    )
  );
}

export function normalizeCoord(coord: CoordSpec | undefined): CoordSpec | undefined {
  if (coord === undefined) return undefined;
  const runtimeCoord = coord as unknown;
  if (runtimeCoord === null || typeof runtimeCoord !== "object" || Array.isArray(runtimeCoord))
    return runtimeCoord as CoordSpec;
  const record = runtimeCoord as Record<string, unknown>;
  if (record["type"] === "cartesian")
    return Object.keys(record).some((key) => key !== "type")
      ? ({ ...record } as CoordSpec)
      : undefined;
  if (record["type"] === "flip") return { ...record } as CoordSpec;
  if (record["type"] === "fixed") {
    const fixed = { ...record } as unknown as { type: "fixed"; ratio?: unknown };
    if (fixed.ratio === 1 || fixed.ratio === undefined) delete fixed.ratio;
    return fixed as CoordSpec;
  }
  if (record["type"] !== "transform") return { ...record } as CoordSpec;
  const transformed = coord as CoordTransformSpec;
  const x = normalizeCoordAxis(transformed.x);
  const y = normalizeCoordAxis(transformed.y);
  const hasUnknownKey = Object.keys(transformed).some(
    (key) => key !== "type" && key !== "x" && key !== "y" && key !== "clip",
  );
  // Default clip is true/absent; only collapse when clip is a valid default.
  const clipIsDefault = transformed.clip === true || transformed.clip === undefined;
  if (!effectiveCoordAxis(x) && !effectiveCoordAxis(y) && clipIsDefault && !hasUnknownKey) {
    return undefined;
  }
  const normalized: CoordSpec = {
    ...transformed,
    type: "transform",
    ...(effectiveCoordAxis(x) && { x: x! }),
    ...(effectiveCoordAxis(y) && { y: y! }),
  };
  if (!effectiveCoordAxis(x)) delete normalized.x;
  if (!effectiveCoordAxis(y)) delete normalized.y;
  // Keep false and non-boolean clip (malformed) for validation.
  if (transformed.clip === true || transformed.clip === undefined) delete normalized.clip;
  return normalized;
}
