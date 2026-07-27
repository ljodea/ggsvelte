/**
 * Area/density group fill color resolution.
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { paintVector } from "./geometry-style.js";

export function areaGroupFillOf(
  frame: LayerFrame,
  fill: ResolvedColorScale | null,
  rows: readonly number[],
): string | null {
  const first = rows[0];
  if (first === undefined) return frame.binding.fill.constant;
  return paintVector(frame, "fill", fill, [first])[0]!;
}
