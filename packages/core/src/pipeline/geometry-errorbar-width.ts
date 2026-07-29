/**
 * Errorbar cap span in normalized [0,1] x units.
 *
 * Nonlinear coordinate wrappers must project each scale-space endpoint
 * (not mirror one projected half-width) — that is why the public surface is
 * span endpoints, not a half-width scalar.
 */
import { resolution as resolutionOf } from "../stats/numeric.js";

import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";

/** Final normalized cap endpoints for one errorbar row. */
export function makeErrorbarXSpan(
  frame: LayerFrame,
  fx: Frame,
  widthParam: number,
): (row: number, center: number) => readonly [number, number] {
  if (fx.xScale.type === "band") {
    const half = (widthParam * fx.xScale.step) / 2;
    return (_row, center) => [center - half, center + half];
  }
  const res = frame.xNumeric === null ? 0 : resolutionOf(frame.xNumeric);
  const scale = fx.xScale;
  return (row, center) => {
    if (res === 0 || frame.xNumeric === null) return [center - 0.01, center + 0.01];
    const value = frame.xNumeric[row]!;
    const half = (widthParam * res) / 2;
    return [scale.normalizeTransformed(value - half), scale.normalizeTransformed(value + half)];
  };
}
