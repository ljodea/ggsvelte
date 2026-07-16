/**
 * Area/density group fill color resolution.
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";

export function areaGroupFillOf(
  frame: LayerFrame,
  fill: ResolvedColorScale | null,
  rows: readonly number[],
): string | null {
  const { binding } = frame;
  let fillColor: string | null = binding.fill.constant;
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    const first = rows[0]!;
    const value =
      frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[first]!;
    fillColor = colorOf(fill, value);
  }
  return fillColor;
}
