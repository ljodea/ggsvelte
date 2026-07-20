/**
 * Emit annotation intercept rule segments (xintercept / yintercept).
 */
import { positionValueToNumber } from "./temporal-position.js";
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
      fx.xScale.type === "band"
        ? fx.xScale.normalize(v)
        : fx.xScale.normalize(positionValueToNumber(v, frame.binding.xConversion)),
      NO_ROW,
    );
  }
  for (const v of frame.yIntercepts) {
    pushHorizontal(
      fx.yScale.type === "band"
        ? fx.yScale.normalize(v)
        : fx.yScale.normalize(positionValueToNumber(v, frame.binding.yConversion)),
      NO_ROW,
    );
  }
}
