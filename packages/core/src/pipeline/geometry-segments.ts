/**
 * Rule segment geometry batch builder (annotation intercepts + data-driven).
 */
import type { SegmentsBatch } from "../scene.js";
import { cellToNumber } from "../table.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf, NO_ROW } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_RULE_LINEWIDTH, positionOf, removedWarning } from "./geometry-shared.js";
import { createSegmentEmitters } from "./geometry-segments-emit.js";

export function segmentsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as { linewidth?: number; alpha?: number };
  const segments: number[] = [];
  const rowIndex: number[] = [];
  const perSegmentColors: string[] = [];
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  let removed = 0;

  const { pushVertical, pushHorizontal } = createSegmentEmitters({
    fx,
    segments,
    rowIndex,
    onRemoved: () => {
      removed++;
    },
  });

  if (binding.ruleForm === "annotation") {
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
  } else {
    for (let row = 0; row < frame.n; row++) {
      const before = rowIndex.length;
      if (binding.ruleForm === "vertical") {
        pushVertical(
          positionOf(fx.xScale, frame.xNumeric, frame.xValues, row),
          frame.rowIndex[row]!,
        );
      } else {
        pushHorizontal(positionOf(fx.yScale, frame.yNumeric, null, row), frame.rowIndex[row]!);
      }
      if (wantsColors && rowIndex.length > before) {
        const value =
          frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
        perSegmentColors.push(colorOf(color, value));
      }
    }
  }
  removedWarning(removed, binding.index, warnings);
  if (rowIndex.length === 0) return null;

  const batch: SegmentsBatch = {
    kind: "segments",
    layerIndex: binding.index,
    panelIndex: 0,
    segments: Float32Array.from(segments),
    rowIndex: Uint32Array.from(rowIndex),
    stroke: binding.color.constant,
    linewidth: params.linewidth ?? DEFAULT_RULE_LINEWIDTH,
    alpha: params.alpha ?? 1,
  };
  if (wantsColors && binding.ruleForm !== "annotation") batch.strokes = perSegmentColors;
  return batch;
}
