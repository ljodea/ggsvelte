/**
 * Strata planning (plan: "Compositing model — interleaved strata").
 *
 * The plot root is a positioned <div> containing an ordered list of full-size
 * sibling strata — <svg> or <canvas> — where document order = paint order
 * (decision 0006). The layout engine assigns CONTIGUOUS same-backend batches
 * to one stratum, so interleaving svg/canvas/svg layers produces exactly
 * three mark strata (bounded: one canvas element per canvas stratum; panels
 * are clipped regions inside it, never canvas-per-panel-per-layer).
 *
 * This module is PURE (no DOM): it partitions Scene batches by the resolved
 * per-layer backends. Text (glyph) batches always stay SVG — canvas text is
 * neither accessible nor crisp under transforms, and the plan pins
 * "axes/grids/legends/text always SVG".
 */
import type { LayerBackend } from "./pipeline.js";
import type { GeometryBatch, Scene } from "./scene.js";

export interface Stratum {
  backend: LayerBackend;
  batches: GeometryBatch[];
}

/**
 * Partition the scene's batches (already in paint order) into contiguous
 * same-backend strata. An empty scene yields no strata.
 */
export function planStrata(scene: Scene, layerBackends: readonly LayerBackend[]): Stratum[] {
  const strata: Stratum[] = [];
  for (const batch of scene.batches) {
    const backend: LayerBackend =
      batch.kind === "glyphs" ? "svg" : (layerBackends[batch.layerIndex] ?? "svg");
    const last = strata.at(-1);
    if (last !== undefined && last.backend === backend) {
      last.batches.push(batch);
    } else {
      strata.push({ backend, batches: [batch] });
    }
  }
  return strata;
}
