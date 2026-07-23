/// <reference lib="dom" />
/**
 * Canvas mark drawers: points, paths, rects, segments, plus per-batch alpha
 * and focus-mask subset passes. Glyph batches are intentionally no-ops here
 * (text always renders as SVG).
 *
 * Primitive drawers live in canvas-marks-{points,paths,segments}.ts; focus-mask
 * helpers in canvas-marks-mask.ts. Thin orchestrator over those drawers for dispatch + public API.
 */
import type { GeometryBatch } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";
import { maskIncludes, type PrimitiveFocusMask } from "./canvas-marks-mask.js";
import { applyDash, drawPaths, drawPathsSubset, linetypeAt } from "./canvas-marks-paths.js";
import { drawPoints, drawPointsSubset } from "./canvas-marks-points.js";
import { drawSegments } from "./canvas-marks-segments.js";

export type { CanvasFocusPresentation, PrimitiveFocusMask } from "./canvas-marks-mask.js";
export { batchPrimitiveCount, maskIsAllFocused } from "./canvas-marks-mask.js";

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
        const strokeColor =
          batch.strokes?.[j] ??
          (batch.stroke === undefined && batch.strokes === undefined
            ? undefined
            : (batch.stroke ?? themeVar("ink", theme)));
        if (strokeColor !== undefined) {
          ctx.strokeStyle = resolve(strokeColor);
          ctx.lineWidth = batch.strokeWidths?.[j] ?? batch.strokeWidth ?? 1;
          applyDash(ctx, linetypeAt(batch, j));
          ctx.strokeRect(
            batch.rects[j * 4]!,
            batch.rects[j * 4 + 1]!,
            batch.rects[j * 4 + 2]!,
            batch.rects[j * 4 + 3]!,
          );
        }
      }
      ctx.globalAlpha = baseAlpha;
      applyDash(ctx, "solid");
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
        const strokeColor =
          batch.strokes?.[j] ??
          (batch.stroke === undefined && batch.strokes === undefined
            ? undefined
            : (batch.stroke ?? themeVar("ink", theme)));
        if (strokeColor !== undefined) {
          ctx.strokeStyle = resolve(strokeColor);
          ctx.lineWidth = batch.strokeWidths?.[j] ?? batch.strokeWidth ?? 1;
          applyDash(ctx, linetypeAt(batch, j));
          ctx.strokeRect(
            batch.rects[j * 4]!,
            batch.rects[j * 4 + 1]!,
            batch.rects[j * 4 + 2]!,
            batch.rects[j * 4 + 3]!,
          );
        }
      }
      ctx.globalAlpha = baseAlpha;
      applyDash(ctx, "solid");
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
