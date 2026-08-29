/// <reference lib="dom" />
/**
 * Canvas point (and point-subset) drawers.
 */
import { resolvePointMark, type PointShapeGeometry } from "../mark-style.js";
import type { PointsBatch } from "../scene.js";
import type { ThemeTokens } from "../theme-construct.js";
import { themeVar } from "../theme-resolve.js";
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

/** Chromium's fill cost rises sharply beyond this many circle subpaths. */
const MAX_CIRCLES_PER_PATH = 2_048;
const OPAQUE_HEX_COLOR = /^#[\da-f]{3}(?:[\da-f]{3})?$/i;

type ScratchCanvas = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

const scratchByTarget = new WeakMap<CanvasRenderingContext2D, ScratchCanvas>();

function scratchCanvasFor(ctx: CanvasRenderingContext2D): ScratchCanvas | null {
  if (typeof ctx.getTransform !== "function" || typeof ctx.drawImage !== "function") return null;
  const target = ctx.canvas;
  const ownerDocument = target.ownerDocument;
  if (ownerDocument === null || ownerDocument === undefined) return null;
  let scratch = scratchByTarget.get(ctx);
  if (scratch === undefined) {
    const canvas = ownerDocument.createElement("canvas");
    const scratchCtx = canvas.getContext("2d");
    if (scratchCtx === null) return null;
    scratch = { canvas, ctx: scratchCtx };
    scratchByTarget.set(ctx, scratch);
  }
  if (scratch.canvas.width !== target.width) scratch.canvas.width = target.width;
  if (scratch.canvas.height !== target.height) scratch.canvas.height = target.height;
  return scratch;
}

function resolvedOpaquePalette(
  palette: readonly string[],
  buckets: readonly number[][],
  resolve: ColorResolver,
): (string | undefined)[] | null {
  const resolved = Array.from<string | undefined>({ length: palette.length });
  for (let p = 0; p < palette.length; p++) {
    if (buckets[p]!.length === 0) continue;
    const color = resolve(palette[p]!);
    // Per-circle scratch fills preserve one-path alpha semantics only when
    // the source color itself is opaque. Keep the giant path for every other
    // CSS color form rather than guessing at embedded alpha.
    if (!OPAQUE_HEX_COLOR.test(color)) return null;
    resolved[p] = color;
  }
  return resolved;
}

/**
 * Paint each opaque palette color onto a cleared scratch bitmap, then apply
 * the batch alpha once when compositing that color onto the target. This
 * preserves the giant path's same-color overlap semantics without asking
 * Chromium to rasterize tens of thousands of circle subpaths at once.
 */
function drawIndexedCirclesViaScratch(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  buckets: readonly number[][],
  resolvedPalette: readonly (string | undefined)[],
  scratch: ScratchCanvas,
): void {
  const targetTransform = ctx.getTransform();
  const positions = batch.positions;
  const r = batch.size;
  const scratchCtx = scratch.ctx;
  for (let p = 0; p < buckets.length; p++) {
    const list = buckets[p]!;
    const color = resolvedPalette[p];
    if (list.length === 0 || color === undefined) continue;
    scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
    scratchCtx.clearRect(0, 0, scratch.canvas.width, scratch.canvas.height);
    scratchCtx.setTransform(
      targetTransform.a,
      targetTransform.b,
      targetTransform.c,
      targetTransform.d,
      targetTransform.e,
      targetTransform.f,
    );
    scratchCtx.globalAlpha = 1;
    scratchCtx.globalCompositeOperation = "source-over";
    scratchCtx.fillStyle = color;
    for (const j of list) {
      scratchCtx.beginPath();
      scratchCtx.arc(positions[j * 2]!, positions[j * 2 + 1]!, r, 0, Math.PI * 2);
      scratchCtx.fill();
    }
    // The scratch bitmap is already in device pixels. Reset only the target
    // transform for drawImage; the target's device-space panel clip survives.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scratch.canvas, 0, 0);
    ctx.restore();
  }
  // Retain the element/context but release its full backing bitmap between
  // draws. High-DPR charts can otherwise pin tens of MB per target canvas.
  scratch.canvas.width = 0;
  scratch.canvas.height = 0;
}

/** One fill per palette entry. `include` is null for the full batch. */
function drawIndexedColorPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  resolve: ColorResolver,
  include: ((index: number) => boolean) | null,
): void {
  const palette = batch.colorPalette!;
  const indexes = batch.colorIndexes!;
  const n = batch.rowIndex.length;
  const buckets: number[][] = Array.from({ length: palette.length }, () => []);
  let largestBucket = 0;
  for (let j = 0; j < n; j++) {
    if (include !== null && !include(j)) continue;
    const id = indexes[j]!;
    const bucket = (buckets[id] ??= []);
    bucket.push(j);
    if (bucket.length > largestBucket) largestBucket = bucket.length;
  }
  const circles = isFilledCircleBatch(batch);
  if (circles && largestBucket > MAX_CIRCLES_PER_PATH) {
    const resolvedPalette = resolvedOpaquePalette(palette, buckets, resolve);
    const scratch = resolvedPalette === null ? null : scratchCanvasFor(ctx);
    if (resolvedPalette !== null && scratch !== null) {
      drawIndexedCirclesViaScratch(ctx, batch, buckets, resolvedPalette, scratch);
      return;
    }
  }
  for (let p = 0; p < palette.length; p++) {
    const list = buckets[p]!;
    if (list.length === 0) continue;
    ctx.fillStyle = resolve(palette[p]!);
    ctx.beginPath();
    if (circles) traceFilledCircles(ctx, batch, list);
    else for (const j of list) tracePoint(ctx, batch, j);
    ctx.fill();
  }
}

function needsIndividualPaint(batch: PointsBatch): boolean {
  return (
    batch.sizes !== undefined ||
    batch.alphas !== undefined ||
    batch.shapeIndexes !== undefined ||
    batch.shape === "plus" ||
    batch.shape === "cross" ||
    batch.shape === "circle-open"
  );
}

function drawIndividualPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  themeInk: string,
  resolve: ColorResolver,
  include: ((index: number) => boolean) | null,
): void {
  const baseAlpha = ctx.globalAlpha;
  for (let j = 0; j < batch.rowIndex.length; j++) {
    if (include !== null && !include(j)) continue;
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
}

function drawSingleColorPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  themeInk: string,
  resolve: ColorResolver,
  include: ((index: number) => boolean) | null,
): void {
  ctx.fillStyle = batch.fill === null ? themeInk : resolve(batch.fill);
  ctx.beginPath();
  let traced = false;
  const circles = isFilledCircleBatch(batch);
  for (let j = 0; j < batch.rowIndex.length; j++) {
    if (include !== null && !include(j)) continue;
    if (circles) {
      traceFilledCircle(ctx, batch.positions[j * 2]!, batch.positions[j * 2 + 1]!, batch.size);
    } else {
      tracePoint(ctx, batch, j);
    }
    traced = true;
  }
  if (traced) ctx.fill();
}

type PointColorBuckets = {
  uniqueColors: string[];
  indicesByColor: Map<string, number[]>;
  highCardinality: boolean;
};

function bucketPointColors(
  batch: PointsBatch,
  themeInk: string,
  include: ((index: number) => boolean) | null,
): PointColorBuckets {
  const uniqueColors: string[] = [];
  const indicesByColor = new Map<string, number[]>();
  let highCardinality = false;
  for (let j = 0; j < batch.rowIndex.length; j++) {
    const color = batch.colors![j] ?? batch.fill ?? themeInk;
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
    if (include === null || include(j)) list.push(j);
  }
  return { uniqueColors, indicesByColor, highCardinality };
}

function drawBucketedPointColors(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  resolve: ColorResolver,
  buckets: PointColorBuckets,
): void {
  const circles = isFilledCircleBatch(batch);
  for (const color of buckets.uniqueColors) {
    const list = buckets.indicesByColor.get(color)!;
    if (list.length === 0) continue;
    ctx.fillStyle = resolve(color);
    ctx.beginPath();
    if (circles) traceFilledCircles(ctx, batch, list);
    else for (const j of list) tracePoint(ctx, batch, j);
    ctx.fill();
  }
}

function drawPointColorRuns(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  themeInk: string,
  resolve: ColorResolver,
  include: ((index: number) => boolean) | null,
): void {
  const n = batch.rowIndex.length;
  const circles = isFilledCircleBatch(batch);
  let runStart = 0;
  while (runStart < n) {
    const color = batch.colors![runStart] ?? batch.fill ?? themeInk;
    let runEnd = runStart + 1;
    while (runEnd < n && (batch.colors![runEnd] ?? batch.fill ?? themeInk) === color) runEnd++;
    ctx.fillStyle = resolve(color);
    ctx.beginPath();
    let traced = false;
    for (let j = runStart; j < runEnd; j++) {
      if (include !== null && !include(j)) continue;
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

function drawColoredPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  themeInk: string,
  resolve: ColorResolver,
  include: ((index: number) => boolean) | null,
): void {
  const buckets = bucketPointColors(batch, themeInk, include);
  if (buckets.highCardinality) {
    drawPointColorRuns(ctx, batch, themeInk, resolve, include);
  } else {
    drawBucketedPointColors(ctx, batch, resolve, buckets);
  }
}

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  batch: PointsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const themeInk = resolve(themeVar("ink", theme));
  if (needsIndividualPaint(batch)) {
    drawIndividualPoints(ctx, batch, themeInk, resolve, null);
    return;
  }
  if (batch.colorIndexes !== undefined && batch.colorPalette !== undefined) {
    drawIndexedColorPoints(ctx, batch, resolve, null);
    return;
  }
  if (batch.colors === undefined) {
    drawSingleColorPoints(ctx, batch, themeInk, resolve, null);
    return;
  }
  drawColoredPoints(ctx, batch, themeInk, resolve, null);
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
  if (needsIndividualPaint(batch)) {
    drawIndividualPoints(ctx, batch, themeInk, resolve, includes);
    return;
  }
  if (batch.colorIndexes !== undefined && batch.colorPalette !== undefined) {
    drawIndexedColorPoints(ctx, batch, resolve, includes);
    return;
  }
  if (batch.colors === undefined) {
    drawSingleColorPoints(ctx, batch, themeInk, resolve, includes);
    return;
  }
  drawColoredPoints(ctx, batch, themeInk, resolve, includes);
}
