/**
 * Scale canonicalization for normalize() — position type rewrites and color hex.
 * Coord: normalize-coord.ts. Layer/aes orchestration: normalize.ts.
 */

import type { ColorScaleSpec, PositionScaleSpec, Scales } from "./schema.js";

function normalizeHexColor(color: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (match === null) return color;
  const digits = match[1]!.toLowerCase();
  return digits.length === 3
    ? `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    : `#${digits}`;
}

function normalizeColorScale(scale: ColorScaleSpec): ColorScaleSpec {
  const fallbacks = {
    ...(scale.naValue !== undefined && { naValue: normalizeHexColor(scale.naValue) }),
    ...(scale.unknownValue !== undefined && {
      unknownValue: normalizeHexColor(scale.unknownValue),
    }),
  };
  if (scale.type === "identity") return { ...scale, ...fallbacks };
  return {
    ...scale,
    ...(Array.isArray(scale.range) && {
      range: scale.range.map((color) => normalizeHexColor(color)),
    }),
    ...fallbacks,
  };
}

function normalizePositionScale(scale: PositionScaleSpec): PositionScaleSpec {
  if (scale.type === "band") {
    const {
      temporalKind: _,
      parse: __,
      parseFailure: ___,
      timezone: ____,
      disambiguation: _____,
      dateBreaks: ______,
      dateMinorBreaks: _______,
      dateLabels: ________,
      locale: _________,
      weekStart: __________,
      ...band
    } = scale;
    return band;
  }
  // Canonical log10: an authored `type: "log"` (base-10) IS the linear family
  // with the log10 transform. A conflicting explicit transform (identity/sqrt)
  // is left uncanonicalized for pipeline preflight to reject as
  // scale-type-transform-conflict. Pure normalize never throws.
  if (scale.type === "log" && (scale.transform === undefined || scale.transform === "log10")) {
    return { ...scale, type: "linear", transform: "log10" };
  }
  // Binned is a quantitative position family; it never requests a time scale.
  // Contradictory temporal options are left for validate() to reject.
  if (scale.type === "binned") {
    return { ...scale };
  }
  const hasTemporalGuideOption =
    scale.dateBreaks !== undefined ||
    scale.dateMinorBreaks !== undefined ||
    scale.dateLabels !== undefined ||
    scale.locale !== undefined ||
    scale.weekStart !== undefined;
  if ((scale.type === "linear" || scale.type === "log") && hasTemporalGuideOption) {
    return { ...scale };
  }
  const requestsTime =
    scale.type === "time" ||
    scale.temporalKind !== undefined ||
    scale.parse !== undefined ||
    scale.parseFailure !== undefined ||
    scale.timezone !== undefined ||
    scale.disambiguation !== undefined ||
    hasTemporalGuideOption;
  return requestsTime ? { ...scale, type: "time" } : { ...scale };
}

export function normalizeScales(scales: Scales): Scales {
  return {
    ...(scales.x !== undefined && { x: normalizePositionScale(scales.x) }),
    ...(scales.y !== undefined && { y: normalizePositionScale(scales.y) }),
    ...(scales.color !== undefined && { color: normalizeColorScale(scales.color) }),
    ...(scales.fill !== undefined && { fill: normalizeColorScale(scales.fill) }),
  };
}
