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
import { groupBatchesByPanel } from "../group-batches-by-panel.js";
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

/** Re-export pure helper for canvas tests and callers (issue #185). */
export { groupBatchesByPanel };

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
