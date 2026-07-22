/// <reference lib="dom" />
/**
 * Canvas path (and path-subset) drawers.
 */
import { LINETYPE_NAMES } from "@ggsvelte/spec";

import type { PathsBatch, SegmentsBatch } from "../scene.js";
import { LINETYPE_DASHES, type Linetype } from "../scales/style.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";
import { maskIncludes, type PrimitiveFocusMask } from "./canvas-marks-mask.js";

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

export function drawPaths(
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

export function drawPathsSubset(
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

export { applyDash, linetypeAt };
