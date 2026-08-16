/// <reference lib="dom" />
/**
 * Canvas rect drawer. Style resolution goes through resolveRectMark (the
 * renderer-neutral chain shared with SVG and Svelte); this file owns only
 * canvas emission. Optional `includes` skips primitives for focus-mask
 * subset passes.
 */
import { resolveRectMark } from "../mark-style.js";
import type { RectsBatch } from "../scene.js";
import type { ThemeTokens } from "../theme-construct.js";
import { themeVar } from "../theme-resolve.js";
import type { ColorResolver } from "./canvas-dom.js";

function applyResolvedDash(ctx: CanvasRenderingContext2D, dash: readonly number[]): void {
  if (typeof ctx.setLineDash !== "function") return;
  ctx.setLineDash([...dash]);
}

export function drawRects(
  ctx: CanvasRenderingContext2D,
  batch: RectsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  includes?: (index: number) => boolean,
): void {
  // Pre-resolved theme strings, re-resolved at paint like the points path
  // (ColorResolver is idempotent on concrete colors).
  const themeColors = {
    accent: resolve(themeVar("accent", theme)),
    paper: resolve(themeVar("paper", theme)),
    ink: resolve(themeVar("ink", theme)),
  };
  const n = batch.rects.length / 4;
  const baseAlpha = ctx.globalAlpha;
  for (let j = 0; j < n; j++) {
    if (includes !== undefined && !includes(j)) continue;
    const style = resolveRectMark(batch, j, themeColors);
    ctx.globalAlpha = baseAlpha * style.alpha;
    ctx.fillStyle = resolve(style.fill);
    ctx.fillRect(
      batch.rects[j * 4]!,
      batch.rects[j * 4 + 1]!,
      batch.rects[j * 4 + 2]!,
      batch.rects[j * 4 + 3]!,
    );
    if (style.stroke !== undefined) {
      ctx.strokeStyle = resolve(style.stroke);
      ctx.lineWidth = style.strokeWidth;
      applyResolvedDash(ctx, style.dash);
      ctx.strokeRect(
        batch.rects[j * 4]!,
        batch.rects[j * 4 + 1]!,
        batch.rects[j * 4 + 2]!,
        batch.rects[j * 4 + 3]!,
      );
    }
  }
  ctx.globalAlpha = baseAlpha;
  applyResolvedDash(ctx, []);
}
