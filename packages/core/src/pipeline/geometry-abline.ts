/**
 * Abline geometry: clip y = intercept + slope · x to continuous panel domain,
 * emit one SegmentsBatch. Annotation-only (no data rows).
 */
import type { SegmentsBatch } from "../scene.js";
import type { ContinuousScale } from "../scales/train.js";

import { clipAblineToRect } from "./geometry-abline-clip.js";
import type { Frame } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import { packSegmentsBatch } from "./geometry-segments-pack.js";
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { NO_ROW } from "./types.js";

function isContinuous(scale: Frame["xScale"]): scale is ContinuousScale {
  return scale.type === "linear" || scale.type === "time";
}

export function ablineBatch(
  frame: LayerFrame,
  fx: Frame,
  _color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  if (!isContinuous(fx.xScale) || !isContinuous(fx.yScale)) {
    warnings.push({
      code: "abline-scale-unsupported",
      message: `geom_abline requires continuous x and y scales (layer ${frame.binding.index}); band axes are skipped.`,
    });
    return null;
  }

  const params = (frame.binding.layer.params ?? {}) as {
    slope?: number;
    intercept?: number;
  };
  const slope = params.slope ?? 1;
  const intercept = params.intercept ?? 0;
  const [x0, x1] = fx.xScale.domain;
  const [y0, y1] = fx.yScale.domain;
  const clipped = clipAblineToRect(slope, intercept, x0, x1, y0, y1);
  if (clipped === null) return null;

  const [dx0, dy0, dx1, dy1] = clipped;
  const nx0 = fx.xScale.normalize(dx0);
  const ny0 = fx.yScale.normalize(dy0);
  const nx1 = fx.xScale.normalize(dx1);
  const ny1 = fx.yScale.normalize(dy1);
  if (![nx0, ny0, nx1, ny1].every((v) => Number.isFinite(v))) return null;

  const segments = new Float32Array([
    nx0 * fx.innerWidth,
    ny0 * fx.innerHeight,
    nx1 * fx.innerWidth,
    ny1 * fx.innerHeight,
  ]);
  const rowIndex = new Uint32Array([NO_ROW]);
  const styleRows = new Uint32Array([0]);

  return packSegmentsBatch({
    frame,
    segments,
    rowIndex,
    styleRows,
    strokes: null,
    wantsColors: false,
    styles,
  });
}
