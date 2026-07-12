/**
 * M0a-6 spike: per-panel clipping inside a single canvas stratum.
 *
 * Plan constraint: one canvas element per canvas stratum — panels are drawn
 * as clipped regions within it, never canvas-per-panel-per-layer.
 */

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Clipping recipe: save / beginPath / rect(panel) / clip / draw / restore.
 * The panel rect is given in CSS px; because the context carries the dpr
 * transform, the clip region lands on the right device pixels automatically.
 * beginPath before rect is load-bearing: clip() uses the current path, and a
 * stale path from earlier drawing would union into the clip region.
 */
export function drawClippedToPanel(
  ctx: CanvasRenderingContext2D,
  panel: PanelRect,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.width, panel.height);
  ctx.clip();
  draw(ctx);
  ctx.restore();
}
