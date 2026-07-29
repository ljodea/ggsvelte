/**
 * Shared map helpers for numeric style scales (size / linewidth / alpha).
 * Used by sequential/binned and identity resolutions.
 */
import type { NumericStyleAesthetic } from "./scale-style-types.js";
import type { NumericStyleConfig } from "./scale-style-values.js";

export const NUMERIC_DEFAULT_RANGE: Record<NumericStyleAesthetic, readonly [number, number]> = {
  size: [2, 9],
  linewidth: [0.5, 4],
  alpha: [0.2, 1],
};
const NUMERIC_DEFAULT_CONSTANT: Record<NumericStyleAesthetic, number> = {
  size: 2.5,
  linewidth: 1.5,
  alpha: 1,
};

export function numericOutputValid(aesthetic: NumericStyleAesthetic, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (aesthetic === "alpha") return value >= 0 && value <= 1;
  // size may be 0 under sizeUnit area_zero (zero→zero area, #830); linewidth ≥ 0.
  return value >= 0;
}

export function numericFallback(
  aesthetic: NumericStyleAesthetic,
  config: NumericStyleConfig | undefined,
): { naValue: number; unknownValue: number } {
  const fallback = NUMERIC_DEFAULT_CONSTANT[aesthetic];
  return {
    naValue: config?.naValue ?? fallback,
    unknownValue: config?.unknownValue ?? fallback,
  };
}

export function numericMappedValue(
  aesthetic: NumericStyleAesthetic,
  t: number,
  range: readonly [number, number],
  sizeUnit: "area" | "radius" | "area_zero" | undefined,
): number {
  const bounded = Math.min(1, Math.max(0, t));
  if (aesthetic === "size") {
    // radius: linear length map (ggplot2 scale_radius).
    if (sizeUnit === "radius") {
      return range[0] + bounded * (range[1] - range[0]);
    }
    // area_zero: value ∝ area (ggplot2 scale_size_area). Use both range endpoints
    // so reverse (which swaps them in place) still maps non-degenerately: [0, max]
    // → max·√t; [max, 0] → max·√(1−t). Domain still includes 0 via train path.
    if (sizeUnit === "area_zero") {
      return Math.sqrt(range[0] * range[0] + bounded * (range[1] * range[1] - range[0] * range[0]));
    }
    // default area: interpolate by area between range endpoints (existing contract).
    return Math.sqrt(range[0] * range[0] + bounded * (range[1] * range[1] - range[0] * range[0]));
  }
  return range[0] + bounded * (range[1] - range[0]);
}
