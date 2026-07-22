/// <reference lib="dom" />
/**
 * Canvas point (and point-subset) drawers.
 */
import { POINT_SHAPE_NAMES } from "@ggsvelte/spec";

import type { PointsBatch } from "../scene.js";
import type { PointShape } from "../scales/style.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";
import { maskIncludes, type PrimitiveFocusMask } from "./canvas-marks-mask.js";

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

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const themeInk = resolve(themeVar("ink", theme));
  const n = batch.rowIndex.length;
  // plus/cross are open stroke paths — even a literal shape constant cannot use
  // the fill-only fast path (it would paint nothing).
  const needsPerPointPaint =
    batch.sizes !== undefined ||
    batch.alphas !== undefined ||
    batch.shapeIndexes !== undefined ||
    batch.shape === "plus" ||
    batch.shape === "cross";
  if (needsPerPointPaint) {
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
    batch.shape === "cross";
  if (needsPerPointPaint) {
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
    for (const color of uniqueColors) {
      const list = indicesByColor.get(color)!;
      if (list.length === 0) continue;
      ctx.fillStyle = resolve(color);
      ctx.beginPath();
      for (const j of list) tracePoint(ctx, batch, j);
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
    for (let j = runStart; j < runEnd; j++) {
      if (!includes(j)) continue;
      tracePoint(ctx, batch, j);
      traced = true;
    }
    if (traced) ctx.fill();
    runStart = runEnd;
  }
}
