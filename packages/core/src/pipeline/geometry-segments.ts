/**
 * Rule segment geometry batch builder (annotation intercepts + data-driven).
 *
 * Pre-allocates Float32Array/Uint32Array to the max mark count (data: n,
 * annotation: intercept count), then densifies/compacts like glyphs/rects.
 */
import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
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
  styles: ResolvedStyleScales,
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
  // Frame-local rows for style vectors (source rowIndex is identity, not style).
  const styleRows = new Uint32Array(capacity);

  const { pushVertical, pushHorizontal } = createSegmentEmitters({ fx, buffers });

  if (binding.ruleForm === "annotation") {
    emitAnnotationSegments({ frame, fx, pushVertical, pushHorizontal });
    // Annotation intercepts use NO_ROW identity; scaled style constants still
    // need one style sample per emitted segment so packers expand vectors.
    for (let i = 0; i < buffers.kept; i++) styleRows[i] = 0;
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
      styleRows,
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
  const outStyleRows =
    compact.kept === 0
      ? new Uint32Array(0)
      : compact.kept === capacity
        ? styleRows
        : styleRows.subarray(0, compact.kept).slice();

  return packSegmentsBatch({
    frame,
    segments: compact.segments,
    rowIndex: compact.rowIndex,
    styleRows: outStyleRows,
    strokes: outStrokes,
    wantsColors,
    styles,
  });
}
