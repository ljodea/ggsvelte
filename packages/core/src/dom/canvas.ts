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
import type { BatchInteractionMask } from "../interaction-mask.js";
import type { ThemeTokens } from "../theme.js";
import { themeVar } from "../theme.js";

/** Resolve a scene color expression to a concrete canvas-usable color. */
export type ColorResolver = (color: string) => string;

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
  for (let s = 0; s < subpaths; s++) {
    if (maskIncludes(mask, s) !== focused) continue;
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
      for (let j = 0; j < n; j++) {
        if (!includes(j)) continue;
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
        if (!includes(j)) continue;
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
      // Text always renders as SVG; the mask still addresses glyph primitives
      // so SVG and canvas callers can share one renderer-neutral mask shape.
      break;
  }
}

function batchPrimitiveCount(batch: GeometryBatch): number {
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

function maskIsAllFocused(mask: PrimitiveFocusMask, count: number): boolean {
  if (count === 0) return true;
  if ("isFocused" in mask && mask.primitiveCount === count)
    return mask.focusedCount === mask.primitiveCount;
  for (let index = 0; index < count; index++) {
    if (!maskIncludes(mask, index)) return false;
  }
  return true;
}

function drawBatchSubset(
  ctx: CanvasRenderingContext2D,
  batch: GeometryBatch,
  theme: ThemeTokens,
  resolve: ColorResolver,
  mask: PrimitiveFocusMask,
  focused: boolean,
  alphaMultiplier: number,
): void {
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * batch.alpha * alphaMultiplier;
  drawBatchSubsetInner(ctx, batch, theme, resolve, mask, focused);
  ctx.globalAlpha = alpha;
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
 * Group geometry batches by panel once (issue #185): O(B) instead of
 * re-filtering the full list per panel (O(P·B)). Within each panel bucket,
 * order matches the original batch list so paint order is preserved.
 * When `withIndices` is true, also record each batch's original list index
 * for focus-mask alignment on the presentation path.
 *
 * Exported for unit tests that lock the single-pass complexity contract.
 */
export function groupBatchesByPanel(
  panelCount: number,
  batches: readonly GeometryBatch[],
  withIndices: boolean,
): { byPanel: GeometryBatch[][]; indices: number[][] | null } {
  const byPanel: GeometryBatch[][] = Array.from({ length: panelCount }, () => []);
  const indices: number[][] | null = withIndices
    ? Array.from({ length: panelCount }, () => [])
    : null;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const p = batch.panelIndex;
    // Malformed panelIndex (NaN, non-integer, out of range) is a pipeline bug;
    // skip rather than throw so a bad batch cannot take down the whole stratum
    // draw. Integer check matters: `byPanel[1.5]` / `byPanel[NaN]` are not
    // real buckets, and the old filter path silently dropped those too.
    if (!Number.isInteger(p) || p < 0 || p >= panelCount) continue;
    byPanel[p]!.push(batch);
    indices?.[p]!.push(i);
  }
  return { byPanel, indices };
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
  presentation?: CanvasFocusPresentation,
): void {
  ctx.clearRect(0, 0, scene.width, scene.height);
  const needIndices = presentation !== undefined;
  const { byPanel, indices } = groupBatchesByPanel(scene.panels.length, batches, needIndices);
  if (presentation === undefined) {
    // Preserve the original high-volume path completely when focus
    // presentation is not requested.
    for (let p = 0; p < scene.panels.length; p++) {
      const panel = scene.panels[p]!;
      const panelBatches = byPanel[p]!;
      if (panelBatches.length === 0) continue;
      drawClippedToPanel(ctx, panel, () => {
        ctx.save();
        ctx.translate(panel.x, panel.y);
        for (const batch of panelBatches) drawBatch(ctx, batch, scene.theme, resolve);
        ctx.restore();
      });
    }
    return;
  }
  for (let p = 0; p < scene.panels.length; p++) {
    const panel = scene.panels[p]!;
    const panelBatches = byPanel[p]!;
    const panelIndices = indices![p]!;
    if (panelBatches.length === 0) continue;
    drawClippedToPanel(ctx, panel, () => {
      ctx.save();
      ctx.translate(panel.x, panel.y);
      const mutedAlpha = presentation.mutedAlpha ?? scene.theme.interactionMuted;
      // Paint all unaffected/muted primitives first across the stratum, then
      // focused primitives so coincident focused marks remain visible.
      for (let k = 0; k < panelBatches.length; k++) {
        const batch = panelBatches[k]!;
        const index = panelIndices[k]!;
        const mask = presentation.focusMasks[index];
        if (mask === undefined || mask === null) {
          drawBatch(ctx, batch, scene.theme, resolve);
        } else if (!maskIsAllFocused(mask, batchPrimitiveCount(batch))) {
          drawBatchSubset(ctx, batch, scene.theme, resolve, mask, false, mutedAlpha);
        }
      }
      for (let k = 0; k < panelBatches.length; k++) {
        const batch = panelBatches[k]!;
        const index = panelIndices[k]!;
        const mask = presentation.focusMasks[index];
        if (mask === undefined || mask === null) continue;
        if (maskIsAllFocused(mask, batchPrimitiveCount(batch))) {
          drawBatch(ctx, batch, scene.theme, resolve);
        } else {
          drawBatchSubset(ctx, batch, scene.theme, resolve, mask, true, 1);
        }
      }
      ctx.restore();
    });
  }
}
