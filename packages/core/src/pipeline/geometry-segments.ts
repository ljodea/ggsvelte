/**
 * Rule segment geometry batch builder (annotation intercepts + data-driven).
 */
import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_RULE_LINEWIDTH, removedWarning } from "./geometry-shared.js";
import { emitAnnotationSegments } from "./geometry-segments-annotation.js";
import { emitDataSegments } from "./geometry-segments-data.js";
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
