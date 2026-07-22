/**
 * Smooth geometry: optional confidence ribbon plus fitted line.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { bucketByGroup, sortGroupRowsByX } from "./geometry-shared.js";
import { buildSmoothLineBatch } from "./geometry-smooth-line.js";
import { buildSmoothRibbonBatch } from "./geometry-smooth-ribbon.js";

export function smoothBatches(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const groupRows = bucketByGroup(frame, fx, null, warnings);
  if (groupRows.length === 0) return [];
  sortGroupRowsByX(groupRows, frame, fx);

  const out: GeometryBatch[] = [];
  // Ribbon drawn first, under the line.
  const ribbon = buildSmoothRibbonBatch({ frame, fx, color, fill, groupRows });
  if (ribbon !== null) out.push(ribbon);
  out.push(buildSmoothLineBatch({ frame, fx, color, groupRows }));
  return out;
}
