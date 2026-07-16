/**
 * Rule segment geometry batch builder (annotation intercepts + data-driven).
 */
import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { removedWarning } from "./geometry-shared.js";
import { emitAnnotationSegments } from "./geometry-segments-annotation.js";
import { emitDataSegments } from "./geometry-segments-data.js";
import { createSegmentEmitters } from "./geometry-segments-emit.js";
import { packSegmentsBatch } from "./geometry-segments-pack.js";

export function segmentsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
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
    emitAnnotationSegments({ frame, fx, pushVertical, pushHorizontal });
  } else {
    emitDataSegments({
      frame,
      fx,
      color,
      wantsColors,
      pushVertical,
      pushHorizontal,
      rowIndex,
      perSegmentColors,
    });
  }
  removedWarning(removed, binding.index, warnings);
  return packSegmentsBatch({ frame, segments, rowIndex, perSegmentColors, wantsColors });
}
