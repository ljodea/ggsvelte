/// <reference lib="dom" />
/**
 * Canvas segment drawers with run-length stroke batching.
 */
import type { SegmentsBatch } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";

function traceSegment(ctx: CanvasRenderingContext2D, batch: SegmentsBatch, j: number): void {
  if (batch.renderPositions !== undefined && batch.renderPathOffsets !== undefined) {
    const start = batch.renderPathOffsets[j]!;
    const end = batch.renderPathOffsets[j + 1]!;
    if (end <= start) return;
    ctx.moveTo(batch.renderPositions[start * 2]!, batch.renderPositions[start * 2 + 1]!);
    for (let vertex = start + 1; vertex < end; vertex++) {
      ctx.lineTo(batch.renderPositions[vertex * 2]!, batch.renderPositions[vertex * 2 + 1]!);
    }
    return;
  }
  const o = j * 4;
  ctx.moveTo(batch.segments[o]!, batch.segments[o + 1]!);
  ctx.lineTo(batch.segments[o + 2]!, batch.segments[o + 3]!);
}

function segmentStrokeAt(
  batch: SegmentsBatch,
  j: number,
  themeInk: string,
  resolve: ColorResolver,
): string {
  const stroke = batch.strokes?.[j] ?? batch.stroke;
  return stroke === null || stroke === undefined ? themeInk : resolve(stroke);
}

/**
 * Draw segments with Θ(runs) stroke() calls: mono batches (no per-segment
 * `strokes`) are one path; per-segment colors collapse contiguous same-color
 * runs. Optional `includes` skips primitives for focus-mask subset passes.
 */
export function drawSegments(
  ctx: CanvasRenderingContext2D,
  batch: SegmentsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  includes?: (index: number) => boolean,
): void {
  const themeInk = resolve(themeVar("ink", theme));
  ctx.lineWidth = batch.linewidth;
  const n = batch.segments.length / 4;
  if (n === 0) return;

  if (batch.strokes === undefined) {
    ctx.strokeStyle = segmentStrokeAt(batch, 0, themeInk, resolve);
    ctx.beginPath();
    let traced = false;
    for (let j = 0; j < n; j++) {
      if (includes !== undefined && !includes(j)) continue;
      traceSegment(ctx, batch, j);
      traced = true;
    }
    if (traced) ctx.stroke();
    return;
  }

  let runStart = 0;
  while (runStart < n) {
    if (includes !== undefined && !includes(runStart)) {
      runStart++;
      continue;
    }
    const color = segmentStrokeAt(batch, runStart, themeInk, resolve);
    let runEnd = runStart + 1;
    while (runEnd < n && segmentStrokeAt(batch, runEnd, themeInk, resolve) === color) runEnd++;
    ctx.strokeStyle = color;
    ctx.beginPath();
    let traced = false;
    for (let j = runStart; j < runEnd; j++) {
      if (includes !== undefined && !includes(j)) continue;
      traceSegment(ctx, batch, j);
      traced = true;
    }
    if (traced) ctx.stroke();
    runStart = runEnd;
  }
}
