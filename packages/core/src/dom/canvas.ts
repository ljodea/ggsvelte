/// <reference lib="dom" />
/**
 * Canvas batch renderers (graduated from spike 0006).
 *
 * Draws GeometryBatch kinds with THE SAME style semantics as the SVG
 * renderers (render-svg.ts / <Batch>): null styling values mean the theme
 * role (ink for strokes/points, accent for fills, paper for fillRole
 * "paper"); data-mapped colors are literal strings; alpha applies per batch.
 * Theme roles ride `var(--gg-*, fallback)` expressions exactly like SVG —
 * canvas cannot parse those, so callers pass a resolver built from the
 * live DOM (cssColorResolver) which reads the custom property (or
 * currentColor) off the plot root; dark-mode CSS overrides therefore
 * restyle canvas strata on redraw just like SVG strata.
 *
 * DPR recipe (proven in decision 0006): backing store = round(css * dpr),
 * CSS box pinned via style, ONE absolute setTransform so all drawing code
 * stays in CSS px and resize re-runs cannot compound.
 *
 * Glyph (text) batches are NOT drawn here: text always renders as SVG
 * (plan: "axes/grids/legends/text always SVG"); planStrata routes them.
 */
import type { GeometryBatch, PathsBatch, PointsBatch, Scene } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";

/** Resolve a scene color expression to a concrete canvas-usable color. */
export type ColorResolver = (color: string) => string;

const VAR_RE = /^var\((--[\w-]+)\s*,\s*(.+)\)$/;

/**
 * Build a resolver over an element's computed style: `var(--gg-*, fallback)`
 * reads the custom property (falling back to the embedded token), and
 * `currentColor` reads the computed `color`. Resolutions are cached; build
 * a fresh resolver per draw so theme flips re-resolve.
 */
export function cssColorResolver(el: Element): ColorResolver {
  const cache = new Map<string, string>();
  let computed: CSSStyleDeclaration | null = null;
  const style = () => (computed ??= getComputedStyle(el));
  return (color: string): string => {
    const cached = cache.get(color);
    if (cached !== undefined) return cached;
    let out = color;
    const match = VAR_RE.exec(out);
    if (match !== null) {
      const value = style().getPropertyValue(match[1]!).trim();
      out = value === "" ? match[2]! : value;
    }
    if (out === "currentColor") out = style().color;
    cache.set(color, out);
    return out;
  };
}

/**
 * Size a canvas for a device pixel ratio (decision 0006 recipe): rounded
 * integer backing store, pinned CSS box, absolute dpr transform.
 */
export function sizeCanvasForDpr(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): void {
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Panel clipping recipe (decision 0006): save / beginPath / rect / clip /
 * draw / restore. beginPath is load-bearing — clip() uses the current path.
 */
export function drawClippedToPanel(
  ctx: CanvasRenderingContext2D,
  panel: { x: number; y: number; width: number; height: number },
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.width, panel.height);
  ctx.clip();
  draw(ctx);
  ctx.restore();
}

function tracePoint(ctx: CanvasRenderingContext2D, batch: PointsBatch, j: number): void {
  const x = batch.positions[j * 2]!;
  const y = batch.positions[j * 2 + 1]!;
  const size = batch.size;
  switch (batch.shape) {
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

function drawPaths(
  ctx: CanvasRenderingContext2D,
  batch: PathsBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const isArea = batch.fills !== undefined;
  const subpaths = batch.pathOffsets.length - 1;
  for (let s = 0; s < subpaths; s++) {
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    if (end <= start) continue;
    ctx.beginPath();
    traceSubpath(ctx, batch, start, end);
    if (isArea) {
      ctx.fillStyle = resolve(batch.fills![s] ?? themeVar("accent", theme));
      ctx.fill();
    } else {
      ctx.strokeStyle = resolve(batch.strokes[s] ?? themeVar("ink", theme));
      ctx.lineWidth = batch.linewidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
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
      for (let j = 0; j < n; j++) {
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
          ctx.lineWidth = batch.strokeWidth ?? 1;
          ctx.strokeRect(
            batch.rects[j * 4]!,
            batch.rects[j * 4 + 1]!,
            batch.rects[j * 4 + 2]!,
            batch.rects[j * 4 + 3]!,
          );
        }
      }
      break;
    }
    case "segments": {
      const themeInk = resolve(themeVar("ink", theme));
      ctx.lineWidth = batch.linewidth;
      const n = batch.segments.length / 4;
      for (let j = 0; j < n; j++) {
        const stroke = batch.strokes?.[j] ?? batch.stroke;
        ctx.strokeStyle = stroke === null || stroke === undefined ? themeInk : resolve(stroke);
        ctx.beginPath();
        ctx.moveTo(batch.segments[j * 4]!, batch.segments[j * 4 + 1]!);
        ctx.lineTo(batch.segments[j * 4 + 2]!, batch.segments[j * 4 + 3]!);
        ctx.stroke();
      }
      break;
    }
    case "glyphs":
      // Text always renders as SVG (module docs); nothing to draw.
      break;
  }
}

/** Draw one batch in panel-local coordinates (alpha applied per batch). */
export function drawBatch(
  ctx: CanvasRenderingContext2D,
  batch: GeometryBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
): void {
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * batch.alpha;
  drawBatchInner(ctx, batch, theme, resolve);
  ctx.globalAlpha = alpha;
}

/**
 * Draw a canvas stratum's batches, clipped per panel (one canvas per
 * stratum; panels are clipped regions inside it — decision 0006). The ctx
 * must already carry the dpr transform (sizeCanvasForDpr); this clears the
 * CSS-px viewport first, so a redraw never accumulates.
 */
export function drawStratum(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  batches: readonly GeometryBatch[],
  resolve: ColorResolver,
): void {
  ctx.clearRect(0, 0, scene.width, scene.height);
  for (let p = 0; p < scene.panels.length; p++) {
    const panel = scene.panels[p]!;
    const panelBatches = batches.filter((b) => b.panelIndex === p);
    if (panelBatches.length === 0) continue;
    drawClippedToPanel(ctx, panel, () => {
      ctx.save();
      ctx.translate(panel.x, panel.y);
      for (const batch of panelBatches) drawBatch(ctx, batch, scene.theme, resolve);
      ctx.restore();
    });
  }
}
