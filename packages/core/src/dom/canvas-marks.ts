/// <reference lib="dom" />
/**
 * Canvas mark drawers: points, paths, rects, segments, plus per-batch alpha
 * and focus-mask subset passes. Glyph batches are intentionally no-ops here
 * (text always renders as SVG).
 */
import { LINETYPE_NAMES, POINT_SHAPE_NAMES } from "@ggsvelte/spec";

import type { GeometryBatch, PathsBatch, PointsBatch, SegmentsBatch } from "../scene.js";
import { LINETYPE_DASHES, type Linetype, type PointShape } from "../scales/style.js";
import type { BatchInteractionMask } from "../interaction-mask.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";

/**
 * Renderer-neutral focus membership for one geometry batch. Values address
 * point/rect/segment/glyph primitives, or path subpaths (not path vertices).
 * Zero means muted and a non-zero value means focused.
 */
export type PrimitiveFocusMask = ArrayLike<number> | BatchInteractionMask;

/** Optional focus presentation aligned to the `batches` passed to drawStratum. */
export interface CanvasFocusPresentation {
  readonly focusMasks: readonly (PrimitiveFocusMask | null | undefined)[];
  /** Defaults to the scene theme's interactionMuted token. */
  readonly mutedAlpha?: number;
}

function maskIncludes(mask: PrimitiveFocusMask, index: number): boolean {
  if ("isFocused" in mask) return mask.isFocused(index);
  const value = mask[index];
  return value !== undefined && value !== 0;
}

function tracePoint(ctx: CanvasRenderingContext2D, batch: PointsBatch, j: number): void {
  const x = batch.positions[j * 2]!;
  const y = batch.positions[j * 2 + 1]!;
  const size = batch.sizes?.[j] ?? batch.size;
  const shape: PointShape =
    batch.shapeIndexes === undefined ? batch.shape : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!;
  switch (shape) {
    case "square":
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case "triangle":
      // Same proportions as the SVG renderer's triangle path.
      ctx.moveTo(x, y - size * 1.2);
      ctx.lineTo(x + size * 1.1, y + size * 0.9);
      ctx.lineTo(x - size * 1.1, y + size * 0.9);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(x, y - size * 1.25);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size * 1.25);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      break;
    case "plus":
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      break;
    case "cross":
      ctx.moveTo(x - size * 0.75, y - size * 0.75);
      ctx.lineTo(x + size * 0.75, y + size * 0.75);
      ctx.moveTo(x + size * 0.75, y - size * 0.75);
      ctx.lineTo(x - size * 0.75, y + size * 0.75);
      break;
    default:
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, Math.PI * 2);
  }
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const themeInk = resolve(themeVar("ink", theme));
  const n = batch.rowIndex.length;
  const mappedGeometry =
    batch.sizes !== undefined || batch.alphas !== undefined || batch.shapeIndexes !== undefined;
  if (mappedGeometry) {
    const baseAlpha = ctx.globalAlpha;
    for (let j = 0; j < n; j++) {
      const color = batch.colors?.[j] ?? batch.fill ?? themeInk;
      const shape =
        batch.shapeIndexes === undefined ? batch.shape : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!;
      ctx.globalAlpha = baseAlpha * (batch.alphas?.[j] ?? 1);
      ctx.beginPath();
      tracePoint(ctx, batch, j);
      if (shape === "plus" || shape === "cross") {
        ctx.strokeStyle = resolve(color);
        ctx.lineWidth = Math.max(1, (batch.sizes?.[j] ?? batch.size) / 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = resolve(color);
        ctx.fill();
      }
    }
    ctx.globalAlpha = baseAlpha;
    return;
  }
  if (batch.colors === undefined) {
    // Single fill: one path for the whole batch (the fast path that makes
    // canvas worth it at high counts).
    ctx.fillStyle = batch.fill === null ? themeInk : resolve(batch.fill);
    ctx.beginPath();
    for (let j = 0; j < n; j++) tracePoint(ctx, batch, j);
    ctx.fill();
    return;
  }
  // Per-mark colors: batch consecutive same-color runs.
  let runStart = 0;
  while (runStart < n) {
    const color = batch.colors[runStart] ?? batch.fill ?? themeInk;
    let runEnd = runStart + 1;
    while (runEnd < n && (batch.colors[runEnd] ?? batch.fill ?? themeInk) === color) runEnd++;
    ctx.fillStyle = resolve(color);
    ctx.beginPath();
    for (let j = runStart; j < runEnd; j++) tracePoint(ctx, batch, j);
    ctx.fill();
    runStart = runEnd;
  }
}

function drawPointsSubset(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  mask: PrimitiveFocusMask,
  focused: boolean,
): void {
  const includes = (index: number) => maskIncludes(mask, index) === focused;
  const themeInk = resolve(themeVar("ink", theme));
  const n = batch.rowIndex.length;
  const mappedGeometry =
    batch.sizes !== undefined || batch.alphas !== undefined || batch.shapeIndexes !== undefined;
  if (mappedGeometry) {
    const baseAlpha = ctx.globalAlpha;
    for (let j = 0; j < n; j++) {
      if (!includes(j)) continue;
      const color = batch.colors?.[j] ?? batch.fill ?? themeInk;
      const shape =
        batch.shapeIndexes === undefined ? batch.shape : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!;
      ctx.globalAlpha = baseAlpha * (batch.alphas?.[j] ?? 1);
      ctx.beginPath();
      tracePoint(ctx, batch, j);
      if (shape === "plus" || shape === "cross") {
        ctx.strokeStyle = resolve(color);
        ctx.lineWidth = Math.max(1, (batch.sizes?.[j] ?? batch.size) / 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = resolve(color);
        ctx.fill();
      }
    }
    ctx.globalAlpha = baseAlpha;
    return;
  }
  if (batch.colors === undefined) {
    ctx.fillStyle = batch.fill === null ? themeInk : resolve(batch.fill);
    ctx.beginPath();
    let traced = false;
    for (let j = 0; j < n; j++) {
      if (!includes(j)) continue;
      tracePoint(ctx, batch, j);
      traced = true;
    }
    if (traced) ctx.fill();
    return;
  }
  // Interactive masks must not turn alternating categorical colors into one
  // beginPath/fill pair per point. For the normal small categorical case,
  // batch by first-seen color while retaining the focused-over-muted pass
  // boundary. Fall back to contiguous runs for high-cardinality colors.
  const uniqueColors: string[] = [];
  const seenColors = new Set<string>();
  for (let j = 0; j < n && uniqueColors.length <= 64; j++) {
    const color = batch.colors[j] ?? batch.fill ?? themeInk;
    if (seenColors.has(color)) continue;
    seenColors.add(color);
    uniqueColors.push(color);
  }
  if (uniqueColors.length <= 64) {
    for (const color of uniqueColors) {
      ctx.fillStyle = resolve(color);
      ctx.beginPath();
      let traced = false;
      for (let j = 0; j < n; j++) {
        if ((batch.colors[j] ?? batch.fill ?? themeInk) !== color || !includes(j)) continue;
        tracePoint(ctx, batch, j);
        traced = true;
      }
      if (traced) ctx.fill();
    }
    return;
  }
  let runStart = 0;
  while (runStart < n) {
    const color = batch.colors[runStart] ?? batch.fill ?? themeInk;
    let runEnd = runStart + 1;
    while (runEnd < n && (batch.colors[runEnd] ?? batch.fill ?? themeInk) === color) runEnd++;
    ctx.fillStyle = resolve(color);
    ctx.beginPath();
    let traced = false;
    for (let j = runStart; j < runEnd; j++) {
      if (!includes(j)) continue;
      tracePoint(ctx, batch, j);
      traced = true;
    }
    if (traced) ctx.fill();
    runStart = runEnd;
  }
}

function traceSubpath(
  ctx: CanvasRenderingContext2D,
  batch: PathsBatch,
  start: number,
  end: number,
): void {
  ctx.moveTo(batch.positions[start * 2]!, batch.positions[start * 2 + 1]!);
  for (let i = start + 1; i < end; i++) {
    const x = batch.positions[i * 2]!;
    const y = batch.positions[i * 2 + 1]!;
    if (batch.curve === "step") {
      const prevX = batch.positions[(i - 1) * 2]!;
      const prevY = batch.positions[(i - 1) * 2 + 1]!;
      const mid = (prevX + x) / 2;
      ctx.lineTo(mid, prevY);
      ctx.lineTo(mid, y);
    }
    ctx.lineTo(x, y);
  }
  if (batch.closed === true) ctx.closePath();
}

function linetypeAt(batch: PathsBatch | SegmentsBatch, index: number): Linetype {
  return batch.linetypeIndexes === undefined
    ? (batch.linetype ?? "solid")
    : LINETYPE_NAMES[batch.linetypeIndexes[index]!]!;
}

function applyDash(ctx: CanvasRenderingContext2D, linetype: Linetype): void {
  if (typeof ctx.setLineDash !== "function") return;
  ctx.setLineDash(LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? []);
}

function drawPaths(
  ctx: CanvasRenderingContext2D,
  batch: PathsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const isArea = batch.fills !== undefined;
  const subpaths = batch.pathOffsets.length - 1;
  const baseAlpha = ctx.globalAlpha;
  for (let s = 0; s < subpaths; s++) {
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    if (end <= start) continue;
    ctx.beginPath();
    traceSubpath(ctx, batch, start, end);
    ctx.globalAlpha = baseAlpha * (batch.alphas?.[s] ?? 1);
    if (isArea) {
      ctx.fillStyle = resolve(batch.fills![s] ?? themeVar("accent", theme));
      ctx.fill();
    } else {
      ctx.strokeStyle = resolve(batch.strokes[s] ?? themeVar("ink", theme));
      ctx.lineWidth = batch.linewidths?.[s] ?? batch.linewidth;
      applyDash(ctx, linetypeAt(batch, s));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
  ctx.globalAlpha = baseAlpha;
  applyDash(ctx, "solid");
}

function drawPathsSubset(
  ctx: CanvasRenderingContext2D,
  batch: PathsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  mask: PrimitiveFocusMask,
  focused: boolean,
): void {
  const isArea = batch.fills !== undefined;
  const subpaths = batch.pathOffsets.length - 1;
  const baseAlpha = ctx.globalAlpha;
  for (let s = 0; s < subpaths; s++) {
    if (maskIncludes(mask, s) !== focused) continue;
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    if (end <= start) continue;
    ctx.beginPath();
    traceSubpath(ctx, batch, start, end);
    ctx.globalAlpha = baseAlpha * (batch.alphas?.[s] ?? 1);
    if (isArea) {
      ctx.fillStyle = resolve(batch.fills![s] ?? themeVar("accent", theme));
      ctx.fill();
    } else {
      ctx.strokeStyle = resolve(batch.strokes[s] ?? themeVar("ink", theme));
      ctx.lineWidth = batch.linewidths?.[s] ?? batch.linewidth;
      applyDash(ctx, linetypeAt(batch, s));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
  ctx.globalAlpha = baseAlpha;
  applyDash(ctx, "solid");
}

/**
 * Trace one segment as a disconnected subpath (moveTo + lineTo).
 * Multiple segments share one path + stroke when strokeStyle matches —
 * same multi-subpath contract points use for mono/run fills (overlapping
 * antialiasing / alpha compositing differs from per-primitive stroke()).
 */
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
function drawSegments(
  ctx: CanvasRenderingContext2D,
  batch: SegmentsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  includes?: (index: number) => boolean,
): void {
  const themeInk = resolve(themeVar("ink", theme));
  ctx.lineWidth = batch.linewidth;
  applyDash(ctx, batch.linetype ?? "solid");
  const n = batch.segments.length / 4;
  if (n === 0) return;

  const mappedStyle =
    batch.linewidths !== undefined ||
    batch.alphas !== undefined ||
    batch.linetypeIndexes !== undefined;
  if (mappedStyle) {
    const baseAlpha = ctx.globalAlpha;
    for (let j = 0; j < n; j++) {
      if (includes !== undefined && !includes(j)) continue;
      ctx.strokeStyle = segmentStrokeAt(batch, j, themeInk, resolve);
      ctx.lineWidth = batch.linewidths?.[j] ?? batch.linewidth;
      ctx.globalAlpha = baseAlpha * (batch.alphas?.[j] ?? 1);
      applyDash(ctx, linetypeAt(batch, j));
      ctx.beginPath();
      traceSegment(ctx, batch, j);
      ctx.stroke();
    }
    ctx.globalAlpha = baseAlpha;
    applyDash(ctx, "solid");
    return;
  }

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
    applyDash(ctx, "solid");
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
  applyDash(ctx, "solid");
}

function drawBatchInner(
  ctx: CanvasRenderingContext2D,
  batch: GeometryBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  switch (batch.kind) {
    case "points":
      drawPoints(ctx, batch, theme, resolve);
      break;
    case "paths":
      drawPaths(ctx, batch, theme, resolve);
      break;
    case "rects": {
      const themeFill = resolve(themeVar(batch.fillRole ?? "accent", theme));
      const n = batch.rects.length / 4;
      const baseAlpha = ctx.globalAlpha;
      for (let j = 0; j < n; j++) {
        ctx.globalAlpha = baseAlpha * (batch.alphas?.[j] ?? 1);
        const fill = batch.fills?.[j] ?? batch.fill;
        ctx.fillStyle = fill === null || fill === undefined ? themeFill : resolve(fill);
        ctx.fillRect(
          batch.rects[j * 4]!,
          batch.rects[j * 4 + 1]!,
          batch.rects[j * 4 + 2]!,
          batch.rects[j * 4 + 3]!,
        );
        if (batch.stroke !== undefined) {
          ctx.strokeStyle = resolve(batch.stroke ?? themeVar("ink", theme));
          ctx.lineWidth = batch.strokeWidths?.[j] ?? batch.strokeWidth ?? 1;
          ctx.strokeRect(
            batch.rects[j * 4]!,
            batch.rects[j * 4 + 1]!,
            batch.rects[j * 4 + 2]!,
            batch.rects[j * 4 + 3]!,
          );
        }
      }
      ctx.globalAlpha = baseAlpha;
      break;
    }
    case "segments":
      drawSegments(ctx, batch, theme, resolve);
      break;
    case "glyphs":
      // Text always renders as SVG (module docs); nothing to draw.
      break;
  }
}

function drawBatchSubsetInner(
  ctx: CanvasRenderingContext2D,
  batch: GeometryBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  mask: PrimitiveFocusMask,
  focused: boolean,
): void {
  const includes = (index: number) => maskIncludes(mask, index) === focused;
  switch (batch.kind) {
    case "points":
      drawPointsSubset(ctx, batch, theme, resolve, mask, focused);
      break;
    case "paths":
      drawPathsSubset(ctx, batch, theme, resolve, mask, focused);
      break;
    case "rects": {
      const themeFill = resolve(themeVar(batch.fillRole ?? "accent", theme));
      const n = batch.rects.length / 4;
      const baseAlpha = ctx.globalAlpha;
      for (let j = 0; j < n; j++) {
        if (!includes(j)) continue;
        ctx.globalAlpha = baseAlpha * (batch.alphas?.[j] ?? 1);
        const fill = batch.fills?.[j] ?? batch.fill;
        ctx.fillStyle = fill === null || fill === undefined ? themeFill : resolve(fill);
        ctx.fillRect(
          batch.rects[j * 4]!,
          batch.rects[j * 4 + 1]!,
          batch.rects[j * 4 + 2]!,
          batch.rects[j * 4 + 3]!,
        );
        if (batch.stroke !== undefined) {
          ctx.strokeStyle = resolve(batch.stroke ?? themeVar("ink", theme));
          ctx.lineWidth = batch.strokeWidths?.[j] ?? batch.strokeWidth ?? 1;
          ctx.strokeRect(
            batch.rects[j * 4]!,
            batch.rects[j * 4 + 1]!,
            batch.rects[j * 4 + 2]!,
            batch.rects[j * 4 + 3]!,
          );
        }
      }
      ctx.globalAlpha = baseAlpha;
      break;
    }
    case "segments":
      drawSegments(ctx, batch, theme, resolve, includes);
      break;
    case "glyphs":
      // Text always renders as SVG; the mask still addresses glyph primitives
      // so SVG and canvas callers can share one renderer-neutral mask shape.
      break;
  }
}

/** Primitive count for focus-mask address space (paths = subpaths, not vertices). */
export function batchPrimitiveCount(batch: GeometryBatch): number {
  switch (batch.kind) {
    case "points":
    case "rects":
    case "segments":
    case "glyphs":
      return batch.rowIndex.length;
    case "paths":
      return Math.max(0, batch.pathOffsets.length - 1);
    default:
      return 0;
  }
}

/** True when every addressable primitive is focused (fast path → full drawBatch). */
export function maskIsAllFocused(mask: PrimitiveFocusMask, count: number): boolean {
  if (count === 0) return true;
  if ("isFocused" in mask && mask.primitiveCount === count)
    return mask.focusedCount === mask.primitiveCount;
  for (let index = 0; index < count; index++) {
    if (!maskIncludes(mask, index)) return false;
  }
  return true;
}

/**
 * Draw only focused or muted primitives for a batch (focus-presentation pass).
 * `alphaMultiplier` multiplies the batch alpha (muted uses interactionMuted).
 */
export function drawBatchSubset(
  ctx: CanvasRenderingContext2D,
  batch: GeometryBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  mask: PrimitiveFocusMask,
  focused: boolean,
  alphaMultiplier: number,
): void {
  const alpha = ctx.globalAlpha;
  const lineWidth = ctx.lineWidth;
  ctx.globalAlpha = alpha * batch.alpha * alphaMultiplier;
  drawBatchSubsetInner(ctx, batch, theme, resolve, mask, focused);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  applyDash(ctx, "solid");
}

/** Draw one batch in panel-local coordinates (alpha applied per batch). */
export function drawBatch(
  ctx: CanvasRenderingContext2D,
  batch: GeometryBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const alpha = ctx.globalAlpha;
  const lineWidth = ctx.lineWidth;
  ctx.globalAlpha = alpha * batch.alpha;
  drawBatchInner(ctx, batch, theme, resolve);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  applyDash(ctx, "solid");
}
