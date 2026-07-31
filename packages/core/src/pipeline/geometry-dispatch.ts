/**
 * Per-geom geometry batch dispatch for a single layer frame.
 * Implementations register via geometry-register-basic / geometry-register-all.
 */
import type { GeometryBatch } from "../scene.js";

import { getGeomBatchBuilder } from "./geometry-registry.js";
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import { PipelineError } from "./types.js";

export function dispatchGeometryBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const geom = frame.binding.layer.geom;
  const build = getGeomBatchBuilder(geom);
  if (build === undefined) {
    throw new PipelineError(
      "unsupported-param",
      `/layers/${String(frame.binding.index)}/geom`,
      `Geom "${geom}" is not registered in this build. Import @ggsvelte/core (full package) rather than @ggsvelte/core/render, or call registerGeomBatch("${geom}", …).`,
    );
  }
  return build(frame, fx, color, fill, styles, warnings);
}
