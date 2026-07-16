/**
 * Errorbar cap half-width in normalized [0,1] x units.
 */
import { resolution as resolutionOf } from "../stats/numeric.js";

import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";

export function makeErrorbarHalfWidth(
  frame: LayerFrame,
  fx: Frame,
  widthParam: number,
): (row: number) => number {
  if (fx.xScale.type === "band") {
    const half = (widthParam * fx.xScale.step) / 2;
    return () => half;
  }
  const res = frame.xNumeric === null ? 0 : resolutionOf(frame.xNumeric);
  const scale = fx.xScale;
  return (row: number) => {
    if (res === 0 || frame.xNumeric === null) return 0.01; // lone x: 2% of panel
    const v = frame.xNumeric[row]!;
    return Math.abs(scale.normalize(v + (widthParam * res) / 2) - scale.normalize(v));
  };
}
