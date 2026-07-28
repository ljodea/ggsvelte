/// <reference lib="dom" />
/**
 * Canvas segment drawers with run-length stroke batching.
 * strokePaint/glow follow the paths batch contract (#1112).
 */
import { canvasGradientStyle, subpathBounds, type ResolvedGradientPaint } from "../mark-paint.js";
import type { SegmentsBatch } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";
import { applyDash, linetypeAt } from "./canvas-marks-paths.js";

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

function segmentSolidAt(batch: SegmentsBatch, j: number, themeInk: string): string {
  const stroke = batch.strokes?.[j] ?? batch.stroke;
  return stroke === null || stroke === undefined ? themeInk : stroke;
}

function segmentBounds(
  batch: SegmentsBatch,
  j: number,
): { x: number; y: number; width: number; height: number } {
  if (batch.renderPositions !== undefined && batch.renderPathOffsets !== undefined) {
    return subpathBounds(
      batch.renderPositions,
      batch.renderPathOffsets[j]!,
      batch.renderPathOffsets[j + 1]!,
    );
  }
  const o = j * 4;
  const x1 = batch.segments[o]!;
  const y1 = batch.segments[o + 1]!;
  const x2 = batch.segments[o + 2]!;
  const y2 = batch.segments[o + 3]!;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  return {
    x: minX,
    y: minY,
    width: Math.max(Math.abs(x2 - x1), 1e-6),
    height: Math.max(Math.abs(y2 - y1), 1e-6),
  };
}

function resolveSegmentStroke(
  ctx: CanvasRenderingContext2D,
  solid: string,
  paint: ResolvedGradientPaint | undefined,
  bounds: { x: number; y: number; width: number; height: number },
  resolve: ColorResolver,
): string | CanvasGradient {
  if (paint === undefined) return resolve(solid);
  return canvasGradientStyle(ctx, paint, bounds);
}

function applyGlow(ctx: CanvasRenderingContext2D, glow: SegmentsBatch["glow"]): () => void {
  if (glow === undefined) return () => {};
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  ctx.shadowColor = glow.color;
  ctx.shadowBlur = glow.radius;
  if (glow.opacity < 1) {
    const hex = glow.color;
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const r = Number.parseInt(full.slice(1, 3), 16);
    const g = Number.parseInt(full.slice(3, 5), 16);
    const b = Number.parseInt(full.slice(5, 7), 16);
    ctx.shadowColor = `rgba(${String(r)},${String(g)},${String(b)},${String(glow.opacity)})`;
  }
  return () => {
    ctx.shadowColor = prevShadowColor;
    ctx.shadowBlur = prevShadowBlur;
  };
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
  // Save/restore lineCap so a segment batch with lineend does not leak into
  // later rule/errorbar segment batches that leave linecap undefined.
  const previousLineCap = ctx.lineCap;
  if (batch.linecap !== undefined) ctx.lineCap = batch.linecap;
  applyDash(ctx, batch.linetype ?? "solid");
  const n = batch.segments.length / 4;
  if (n === 0) {
    ctx.lineCap = previousLineCap;
    return;
  }

  const restoreGlow = applyGlow(ctx, batch.glow);
  const paint = batch.strokePaint;

  const mappedStyle =
    batch.linewidths !== undefined ||
    batch.alphas !== undefined ||
    batch.linetypeIndexes !== undefined;
  if (mappedStyle) {
    const baseAlpha = ctx.globalAlpha;
    for (let j = 0; j < n; j++) {
      if (includes !== undefined && !includes(j)) continue;
      const solid = segmentSolidAt(batch, j, themeInk);
      ctx.strokeStyle = resolveSegmentStroke(ctx, solid, paint, segmentBounds(batch, j), resolve);
      ctx.lineWidth = batch.linewidths?.[j] ?? batch.linewidth;
      ctx.globalAlpha = baseAlpha * (batch.alphas?.[j] ?? 1);
      applyDash(ctx, linetypeAt(batch, j));
      ctx.beginPath();
      traceSegment(ctx, batch, j);
      ctx.stroke();
    }
    ctx.globalAlpha = baseAlpha;
    applyDash(ctx, "solid");
    restoreGlow();
    ctx.lineCap = previousLineCap;
    return;
  }

  if (batch.strokes === undefined) {
    // Mono stroke: one gradient over the union of traced segments when paint is set.
    if (paint !== undefined) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let j = 0; j < n; j++) {
        if (includes !== undefined && !includes(j)) continue;
        const b = segmentBounds(batch, j);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
      const bounds = Number.isFinite(minX)
        ? {
            x: minX,
            y: minY,
            width: Math.max(maxX - minX, 1e-6),
            height: Math.max(maxY - minY, 1e-6),
          }
        : { x: 0, y: 0, width: 1, height: 1 };
      ctx.strokeStyle = resolveSegmentStroke(
        ctx,
        segmentSolidAt(batch, 0, themeInk),
        paint,
        bounds,
        resolve,
      );
    } else {
      ctx.strokeStyle = resolve(segmentSolidAt(batch, 0, themeInk));
    }
    ctx.beginPath();
    let traced = false;
    for (let j = 0; j < n; j++) {
      if (includes !== undefined && !includes(j)) continue;
      traceSegment(ctx, batch, j);
      traced = true;
    }
    if (traced) ctx.stroke();
    applyDash(ctx, "solid");
    restoreGlow();
    ctx.lineCap = previousLineCap;
    return;
  }

  let runStart = 0;
  while (runStart < n) {
    if (includes !== undefined && !includes(runStart)) {
      runStart++;
      continue;
    }
    const color = segmentSolidAt(batch, runStart, themeInk);
    let runEnd = runStart + 1;
    while (runEnd < n && segmentSolidAt(batch, runEnd, themeInk) === color) runEnd++;
    // Gradient paint is layer-constant; solid run color still drives fallback.
    if (paint !== undefined) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let j = runStart; j < runEnd; j++) {
        if (includes !== undefined && !includes(j)) continue;
        const b = segmentBounds(batch, j);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
      const bounds = Number.isFinite(minX)
        ? {
            x: minX,
            y: minY,
            width: Math.max(maxX - minX, 1e-6),
            height: Math.max(maxY - minY, 1e-6),
          }
        : { x: 0, y: 0, width: 1, height: 1 };
      ctx.strokeStyle = resolveSegmentStroke(ctx, color, paint, bounds, resolve);
    } else {
      ctx.strokeStyle = resolve(color);
    }
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
  applyDash(ctx, "solid");
  restoreGlow();
  ctx.lineCap = previousLineCap;
}
