/// <reference lib="dom" />
/**
 * Canvas path (and path-subset) drawers.
 */
import {
  areaOutlineActive,
  canvasGradientStyle,
  linetypeDash,
  markLinetype,
  resolvePathMark,
  subpathBounds,
  type ResolvedGradientPaint,
} from "../mark-paint.js";
import type { PathsBatch, RectsBatch, SegmentsBatch } from "../scene.js";
import type { Linetype } from "../scales/style.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";
import type { ColorResolver } from "./canvas-dom.js";
import { maskIncludes, type PrimitiveFocusMask } from "./canvas-marks-mask.js";

function resolvePaintStyle(
  ctx: CanvasRenderingContext2D,
  solid: string,
  paint: ResolvedGradientPaint | undefined,
  bounds: { x: number; y: number; width: number; height: number },
  resolve: ColorResolver,
): string | CanvasGradient {
  if (paint === undefined) return resolve(solid);
  return canvasGradientStyle(ctx, paint, bounds);
}

function applyGlow(ctx: CanvasRenderingContext2D, glow: PathsBatch["glow"]): () => void {
  if (glow === undefined) return () => {};
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  ctx.shadowColor = glow.color;
  ctx.shadowBlur = glow.radius;
  // shadowOpacity is not a standard property; bake via rgba on shadowColor when possible.
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

function linetypeAt(batch: PathsBatch | SegmentsBatch | RectsBatch, index: number): Linetype {
  return markLinetype(batch, index);
}

function applyDash(ctx: CanvasRenderingContext2D, linetype: Linetype): void {
  if (typeof ctx.setLineDash !== "function") return;
  ctx.setLineDash([...linetypeDash(linetype)]);
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  batch: PathsBatch,
  s: number,
  stroke: string,
  resolve: ColorResolver,
): void {
  ctx.strokeStyle = resolve(stroke);
  ctx.lineWidth = batch.linewidths?.[s] ?? batch.linewidth;
  applyDash(ctx, linetypeAt(batch, s));
  ctx.lineJoin = batch.linejoin ?? "round";
  ctx.lineCap = batch.linecap ?? "round";
  ctx.stroke();
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
  const restoreGlow = applyGlow(ctx, batch.glow);
  const themeColors = { ink: themeVar("ink", theme), accent: themeVar("accent", theme) };
  for (let s = 0; s < subpaths; s++) {
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    if (end <= start) continue;
    const bounds = subpathBounds(batch.positions, start, end);
    const style = resolvePathMark(batch, s, themeColors);
    ctx.beginPath();
    traceSubpath(ctx, batch, start, end);
    ctx.globalAlpha = baseAlpha * style.alpha;
    if (isArea) {
      const solid = style.fill === "none" ? themeColors.accent : style.fill;
      ctx.fillStyle = resolvePaintStyle(ctx, solid, batch.fillPaint, bounds, resolve);
      ctx.fill();
      if (style.stroke !== "none") {
        const strokeStyle = resolvePaintStyle(
          ctx,
          style.stroke,
          batch.strokePaint,
          bounds,
          resolve,
        );
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = style.width;
        if (typeof ctx.setLineDash === "function") ctx.setLineDash([...style.dash]);
        ctx.lineJoin = style.linejoin;
        ctx.lineCap = style.linecap;
        ctx.stroke();
      }
    } else {
      const solid = style.stroke === "none" ? themeColors.ink : style.stroke;
      const strokeStyle = resolvePaintStyle(ctx, solid, batch.strokePaint, bounds, resolve);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = style.width;
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([...style.dash]);
      ctx.lineJoin = style.linejoin;
      ctx.lineCap = style.linecap;
      ctx.stroke();
    }
  }
  restoreGlow();
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
      const strokeColor = batch.strokes[s];
      const linewidth = batch.linewidths?.[s] ?? batch.linewidth;
      if (areaOutlineActive(strokeColor, linewidth)) {
        strokePath(ctx, batch, s, strokeColor, resolve);
      }
    } else {
      strokePath(ctx, batch, s, batch.strokes[s] ?? themeVar("ink", theme), resolve);
    }
  }
  ctx.globalAlpha = baseAlpha;
  applyDash(ctx, "solid");
}

export { applyDash, linetypeAt };
