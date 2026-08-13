/// <reference lib="dom" />
/**
 * Canvas point (and point-subset) drawers.
 */
import { resolvePointMark, type PointShapeGeometry } from "../mark-style.js";
import type { PointsBatch } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";
import { maskIncludes, type PrimitiveFocusMask } from "./canvas-marks-mask.js";

function traceGeometry(ctx: CanvasRenderingContext2D, geometry: PointShapeGeometry): void {
  switch (geometry.kind) {
    case "rect":
      ctx.rect(geometry.x, geometry.y, geometry.width, geometry.height);
      break;
    case "polygon": {
      const [first, ...rest] = geometry.points;
      if (first === undefined) return;
      ctx.moveTo(first[0], first[1]);
      for (const [x, y] of rest) ctx.lineTo(x, y);
      ctx.closePath();
      break;
    }
    case "lines":
      for (const [a, b] of geometry.segments) {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      break;
    case "circle":
      ctx.moveTo(geometry.cx + geometry.r, geometry.cy);
      ctx.arc(geometry.cx, geometry.cy, geometry.r, 0, Math.PI * 2);
      break;
  }
}

function tracePoint(ctx: CanvasRenderingContext2D, batch: PointsBatch, j: number): void {
  const style = resolvePointMark(batch, j, "#000");
  traceGeometry(ctx, style.geometry);
}

/** Filled circle: same commands as `pointShapeGeometry("circle")` without the object. */
function traceFilledCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function traceFilledCircles(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  indexes: ArrayLike<number> | null,
): void {
  const r = batch.size;
  const positions = batch.positions;
  if (indexes === null) {
    const n = batch.rowIndex.length;
    for (let j = 0; j < n; j++) {
      traceFilledCircle(ctx, positions[j * 2]!, positions[j * 2 + 1]!, r);
    }
    return;
  }
  for (let i = 0; i < indexes.length; i++) {
    const j = indexes[i]!;
    traceFilledCircle(ctx, positions[j * 2]!, positions[j * 2 + 1]!, r);
  }
}

function isFilledCircleBatch(batch: PointsBatch): boolean {
  return batch.shape === "circle";
}

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const themeInk = resolve(themeVar("ink", theme));
  const n = batch.rowIndex.length;
  // plus/cross/circle-open are open stroke paths — even a literal shape
  // constant cannot use the fill-only fast path (it would paint nothing).
  const needsPerPointPaint =
    batch.sizes !== undefined ||
    batch.alphas !== undefined ||
    batch.shapeIndexes !== undefined ||
    batch.shape === "plus" ||
    batch.shape === "cross" ||
    batch.shape === "circle-open";
  if (needsPerPointPaint) {
    const baseAlpha = ctx.globalAlpha;
    for (let j = 0; j < n; j++) {
      const style = resolvePointMark(batch, j, themeInk);
      ctx.globalAlpha = baseAlpha * style.alpha;
      ctx.beginPath();
      traceGeometry(ctx, style.geometry);
      if (style.geometry.mode === "stroke") {
        ctx.strokeStyle = resolve(style.fill);
        ctx.lineWidth = style.geometry.strokeWidth;
        ctx.stroke();
      } else {
        ctx.fillStyle = resolve(style.fill);
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
    if (isFilledCircleBatch(batch)) traceFilledCircles(ctx, batch, null);
    else for (let j = 0; j < n; j++) tracePoint(ctx, batch, j);
    ctx.fill();
    return;
  }
  // Per-mark colors: bucket by color when cardinality is small (typical
  // categorical scatter: 5 series interleaved → run-length would be 1).
  // Contiguous runs stay as the high-cardinality fallback (O(n) one pass).
  const uniqueColors: string[] = [];
  const indicesByColor = new Map<string, number[]>();
  let highCardinality = false;
  for (let j = 0; j < n; j++) {
    const color = batch.colors[j] ?? batch.fill ?? themeInk;
    let list = indicesByColor.get(color);
    if (list === undefined) {
      list = [];
      indicesByColor.set(color, list);
      uniqueColors.push(color);
      if (uniqueColors.length > 64) {
        highCardinality = true;
        break;
      }
    }
    list.push(j);
  }
  if (!highCardinality) {
    const circles = isFilledCircleBatch(batch);
    for (const color of uniqueColors) {
      const list = indicesByColor.get(color)!;
      ctx.fillStyle = resolve(color);
      ctx.beginPath();
      if (circles) traceFilledCircles(ctx, batch, list);
      else for (const j of list) tracePoint(ctx, batch, j);
      ctx.fill();
    }
    return;
  }
  // High-cardinality: batch consecutive same-color runs.
  const circles = isFilledCircleBatch(batch);
  let runStart = 0;
  while (runStart < n) {
    const color = batch.colors[runStart] ?? batch.fill ?? themeInk;
    let runEnd = runStart + 1;
    while (runEnd < n && (batch.colors[runEnd] ?? batch.fill ?? themeInk) === color) runEnd++;
    ctx.fillStyle = resolve(color);
    ctx.beginPath();
    if (circles) {
      for (let j = runStart; j < runEnd; j++) {
        traceFilledCircle(ctx, batch.positions[j * 2]!, batch.positions[j * 2 + 1]!, batch.size);
      }
    } else {
      for (let j = runStart; j < runEnd; j++) tracePoint(ctx, batch, j);
    }
    ctx.fill();
    runStart = runEnd;
  }
}

export function drawPointsSubset(
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
  const needsPerPointPaint =
    batch.sizes !== undefined ||
    batch.alphas !== undefined ||
    batch.shapeIndexes !== undefined ||
    batch.shape === "plus" ||
    batch.shape === "cross" ||
    batch.shape === "circle-open";
  if (needsPerPointPaint) {
    const baseAlpha = ctx.globalAlpha;
    for (let j = 0; j < n; j++) {
      if (!includes(j)) continue;
      const style = resolvePointMark(batch, j, themeInk);
      ctx.globalAlpha = baseAlpha * style.alpha;
      ctx.beginPath();
      traceGeometry(ctx, style.geometry);
      if (style.geometry.mode === "stroke") {
        ctx.strokeStyle = resolve(style.fill);
        ctx.lineWidth = style.geometry.strokeWidth;
        ctx.stroke();
      } else {
        ctx.fillStyle = resolve(style.fill);
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
    const circles = isFilledCircleBatch(batch);
    for (let j = 0; j < n; j++) {
      if (!includes(j)) continue;
      if (circles) {
        traceFilledCircle(ctx, batch.positions[j * 2]!, batch.positions[j * 2 + 1]!, batch.size);
      } else {
        tracePoint(ctx, batch, j);
      }
      traced = true;
    }
    if (traced) ctx.fill();
    return;
  }
  // Interactive masks must not turn alternating categorical colors into one
  // beginPath/fill pair per point. For the normal small categorical case
  // (≤64 global first-seen colors), bucket included indices by color in one
  // O(n) pass — not re-scan n for each of C colors (O(C·n)). Preserve global
  // first-seen paint order (including colors only present on the other mask
  // half). Fall back to contiguous runs when cardinality exceeds 64.
  const uniqueColors: string[] = [];
  const indicesByColor = new Map<string, number[]>();
  let highCardinality = false;
  for (let j = 0; j < n; j++) {
    const color = batch.colors[j] ?? batch.fill ?? themeInk;
    let list = indicesByColor.get(color);
    if (list === undefined) {
      list = [];
      indicesByColor.set(color, list);
      uniqueColors.push(color);
      // Mirror the prior discovery loop: collect at most 65 names, then bail
      // to run-length (uniqueColors.length > 64). Incomplete buckets are unused.
      if (uniqueColors.length > 64) {
        highCardinality = true;
        break;
      }
    }
    if (includes(j)) list.push(j);
  }
  if (!highCardinality) {
    const circles = isFilledCircleBatch(batch);
    for (const color of uniqueColors) {
      const list = indicesByColor.get(color)!;
      if (list.length === 0) continue;
      ctx.fillStyle = resolve(color);
      ctx.beginPath();
      if (circles) traceFilledCircles(ctx, batch, list);
      else for (const j of list) tracePoint(ctx, batch, j);
      ctx.fill();
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
    const circles = isFilledCircleBatch(batch);
    for (let j = runStart; j < runEnd; j++) {
      if (!includes(j)) continue;
      if (circles) {
        traceFilledCircle(ctx, batch.positions[j * 2]!, batch.positions[j * 2 + 1]!, batch.size);
      } else {
        tracePoint(ctx, batch, j);
      }
      traced = true;
    }
    if (traced) ctx.fill();
    runStart = runEnd;
  }
}
