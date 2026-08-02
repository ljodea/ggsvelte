/**
 * Area/density group fill color resolution.
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { paintVector } from "./geometry-style.js";

/** One paint vector for many group-representative rows (#1309). */
export function areaGroupFillsOf(
  frame: LayerFrame,
  fill: ResolvedColorScale | null,
  styleRows: ArrayLike<number>,
): (string | null)[] {
  return paintVector(frame, "fill", fill, styleRows);
}

export function areaGroupFillOf(
  frame: LayerFrame,
  fill: ResolvedColorScale | null,
  rows: readonly number[],
): string | null {
  const first = rows[0];
  if (first === undefined) return frame.binding.fill.constant;
  return areaGroupFillsOf(frame, fill, [first])[0]!;
}
