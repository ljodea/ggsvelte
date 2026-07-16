/**
 * Shared helpers for smooth geometry batches.
 */
import type { CellValue } from "../table.js";

import type { ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";

/** Ribbon fill opacity (ggplot2 uses 0.4 on grey60; 0.3 reads better over
 *  theme-accent fills — decision 0010). */
export const SMOOTH_RIBBON_ALPHA = 0.3;
export const DEFAULT_SMOOTH_LINEWIDTH = 1;

/** Per-subpath color resolution for grouped batches (first row decides). */
export function groupColor(
  resolved: ResolvedColorScale | null,
  values: readonly CellValue[] | null,
  scaledConstant: CellValue | null,
  firstRow: number,
): string | null {
  if (resolved === null || (values === null && scaledConstant === null)) return null;
  const value = values === null ? scaledConstant! : values[firstRow]!;
  return colorOf(resolved, value);
}
