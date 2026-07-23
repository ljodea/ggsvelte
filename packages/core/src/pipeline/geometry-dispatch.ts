/**
 * Per-geom geometry batch dispatch for a single layer frame.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import {
  areaBatch,
  glyphsBatch,
  lineBatch,
  pointsBatch,
  rectsBatch,
  segmentsBatch,
} from "./geometry-marks.js";
import { boxplotBatches, errorbarBatch, smoothBatches } from "./geometry-composites.js";
import { edgeRectsBatch, rasterRectsBatch, tileRectsBatch } from "./geometry-edge-rects.js";
import { ribbonBatches } from "./geometry-ribbon.js";
import { finiteSegmentBatch } from "./geometry-segment-finite.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

export function dispatchGeometryBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  switch (frame.binding.layer.geom) {
    case "point":
      return single(pointsBatch(frame, fx, color, styles, warnings));
    case "line":
      return single(lineBatch(frame, fx, color, styles, warnings));
    case "col":
    case "bar":
      return single(rectsBatch(frame, fx, fill, styles, warnings));
    case "rect":
      return single(edgeRectsBatch(frame, fx, fill, color, styles, warnings));
    case "tile":
      return single(tileRectsBatch(frame, fx, fill, color, styles, warnings));
    case "raster":
      return single(rasterRectsBatch(frame, fx, fill, styles, warnings));
    case "area":
    case "density":
      return single(areaBatch(frame, fx, fill, styles, warnings));
    case "ribbon":
      return ribbonBatches(frame, fx, color, fill, styles, warnings);
    case "rule":
      return single(segmentsBatch(frame, fx, color, styles, warnings));
    case "segment":
      return single(finiteSegmentBatch(frame, fx, color, styles, warnings));
    case "text":
      return single(glyphsBatch(frame, fx, color, styles, warnings));
    case "smooth":
      return smoothBatches(frame, fx, color, fill, styles, warnings);
    case "boxplot":
      return boxplotBatches(frame, fx, fill, styles, warnings);
    case "errorbar":
      return single(errorbarBatch(frame, fx, color, styles, warnings));
    default:
      return [];
  }
}
