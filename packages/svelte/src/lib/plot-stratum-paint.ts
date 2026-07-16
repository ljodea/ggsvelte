/**
 * Canvas stratum painting and batch focus-mask projection for GGPlot mark
 * compositing. SSR-safe to import; paintCanvasStratum touches the DOM only
 * when called with a live canvas element.
 */

import type { BatchInteractionMask, GeometryBatch, RenderModel } from "@ggsvelte/core";
import { cssColorResolver, drawStratum, sizeCanvasForDpr } from "@ggsvelte/core/dom";

/**
 * Project full-scene interaction masks onto a stratum batch subset using
 * scene batch identity (`indexOf`), matching host masksForBatches.
 * Empty interactionMasks → empty result (no focus styling).
 */
export function resolveBatchFocusMasks(
  sceneBatches: readonly GeometryBatch[],
  batches: readonly GeometryBatch[],
  interactionMasks: readonly (BatchInteractionMask | null)[],
): (BatchInteractionMask | null)[] {
  if (interactionMasks.length === 0) return [];
  return batches.map((batch) => {
    const index = sceneBatches.indexOf(batch);
    return index < 0 ? null : (interactionMasks[index] ?? null);
  });
}

export type PaintCanvasStratumInput = {
  readonly canvas: HTMLCanvasElement;
  readonly scene: RenderModel["scene"];
  readonly batches: readonly GeometryBatch[];
  readonly focusMasks: readonly (BatchInteractionMask | null)[];
};

/**
 * Size for DPR and draw one canvas stratum.
 * Returns false when a 2d context is unavailable — callers must not notify
 * the paint ledger in that case (keeps data-gg-ready false).
 */
export function paintCanvasStratum(input: PaintCanvasStratumInput): boolean {
  const ctx = input.canvas.getContext("2d");
  if (ctx === null) return false;
  const dpr = window.devicePixelRatio || 1;
  sizeCanvasForDpr(input.canvas, ctx, input.scene.width, input.scene.height, dpr);
  drawStratum(
    ctx,
    input.scene,
    input.batches,
    cssColorResolver(input.canvas),
    input.focusMasks.length > 0
      ? {
          focusMasks: input.focusMasks,
          mutedAlpha: input.scene.theme.interactionMuted,
        }
      : undefined,
  );
  return true;
}
