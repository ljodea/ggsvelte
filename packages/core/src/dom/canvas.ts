/// <reference lib="dom" />
/**
 * Canvas stratum orchestration (graduated from spike 0006).
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
 * Glyph (text) batches are NOT drawn on canvas: text always renders as SVG
 * (plan: "axes/grids/legends/text always SVG"); planStrata routes them.
 *
 * Module split: leaf DOM helpers in `canvas-dom.ts`, mark drawers in
 * `canvas-marks.ts`, panel routing + focus presentation here.
 */
import type { GeometryBatch, Scene } from "../scene.js";
import type { ColorResolver } from "./canvas-dom.js";
import { drawClippedToPanel } from "./canvas-dom.js";
import type { CanvasFocusPresentation } from "./canvas-marks.js";
import {
  batchPrimitiveCount,
  drawBatch,
  drawBatchSubset,
  maskIsAllFocused,
} from "./canvas-marks.js";

export type { ColorResolver } from "./canvas-dom.js";
export { cssColorResolver, drawClippedToPanel, sizeCanvasForDpr } from "./canvas-dom.js";
export type { CanvasFocusPresentation, PrimitiveFocusMask } from "./canvas-marks.js";
export { drawBatch } from "./canvas-marks.js";

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
