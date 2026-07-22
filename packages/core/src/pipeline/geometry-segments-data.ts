/**
 * Emit data-driven vertical/horizontal rule segments with optional colors.
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";
import type { SegmentEmitBuffers } from "./geometry-segments-emit.js";

export function emitDataSegments(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  wantsColors: boolean;
  pushVertical: (t: number | undefined, row: number) => void;
  pushHorizontal: (t: number | undefined, row: number) => void;
  buffers: SegmentEmitBuffers;
  strokes: string[] | null;
}): void {
  const { frame, fx, color, wantsColors, pushVertical, pushHorizontal, buffers, strokes } = input;
  const { binding } = frame;

  for (let row = 0; row < frame.n; row++) {
    const before = buffers.kept;
    if (binding.ruleForm === "vertical") {
      pushVertical(positionOf(fx.xScale, frame.xNumeric, frame.xValues, row), frame.rowIndex[row]!);
    } else {
      pushHorizontal(
        positionOf(fx.yScale, frame.yNumeric, frame.yValues, row),
        frame.rowIndex[row]!,
      );
    }
    if (wantsColors && color !== null && strokes !== null && buffers.kept > before) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      strokes[before] = colorOf(color, value);
    }
  }
}
