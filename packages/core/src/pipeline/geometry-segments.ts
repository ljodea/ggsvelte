/**
 * Rule segment geometry batch builder (annotation intercepts + data-driven).
 *
 * Pre-allocates Float32Array/Uint32Array to the max mark count (data: n,
 * annotation: intercept count), then densifies/compacts like glyphs/rects.
 */
import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { removedWarning } from "./geometry-shared.js";
import { emitAnnotationSegments } from "./geometry-segments-annotation.js";
import { emitDataSegments } from "./geometry-segments-data.js";
import {
  compactSegmentBuffers,
  createSegmentEmitters,
  type SegmentEmitBuffers,
} from "./geometry-segments-emit.js";
import { packSegmentsBatch } from "./geometry-segments-pack.js";

export function segmentsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  const capacity =
    binding.ruleForm === "annotation"
      ? frame.xIntercepts.length + frame.yIntercepts.length
      : frame.n;

  const buffers: SegmentEmitBuffers = {
    segments: new Float32Array(capacity * 4),
    rowIndex: new Uint32Array(capacity),
    kept: 0,
    removed: 0,
  };
  const strokes =
    wantsColors && binding.ruleForm !== "annotation"
      ? Array.from<string>({ length: capacity })
      : null;

  const { pushVertical, pushHorizontal } = createSegmentEmitters({ fx, buffers });

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
      buffers,
      strokes,
    });
  }

  removedWarning(buffers.removed, binding.index, warnings);
  const compact = compactSegmentBuffers(buffers, capacity);
  const outStrokes =
    strokes === null
      ? null
      : compact.kept === 0
        ? []
        : compact.kept === capacity
          ? strokes
          : strokes.slice(0, compact.kept);

  return packSegmentsBatch({
    frame,
    segments: compact.segments,
    rowIndex: compact.rowIndex,
    strokes: outStrokes,
    wantsColors,
  });
}
