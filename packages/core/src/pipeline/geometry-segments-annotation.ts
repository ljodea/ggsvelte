/**
 * Emit annotation intercept rule segments (xintercept / yintercept).
 */
import { cellToNumber } from "../table.js";

import type { LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";
import type { Frame } from "./geometry-shared.js";

export function emitAnnotationSegments(input: {
  frame: LayerFrame;
  fx: Frame;
  pushVertical: (t: number | undefined, row: number) => void;
  pushHorizontal: (t: number | undefined, row: number) => void;
}): void {
  const { frame, fx, pushVertical, pushHorizontal } = input;
  for (const v of frame.xIntercepts) {
    pushVertical(
      fx.xScale.type === "band" ? fx.xScale.normalize(v) : fx.xScale.normalize(cellToNumber(v)),
      NO_ROW,
    );
  }
  for (const v of frame.yIntercepts) {
    pushHorizontal(
      fx.yScale.type === "band" ? fx.yScale.normalize(v) : fx.yScale.normalize(cellToNumber(v)),
      NO_ROW,
    );
  }
}
