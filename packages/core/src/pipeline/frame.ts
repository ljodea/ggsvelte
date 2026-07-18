/**
 * Layer-frame construction: run per-panel stats to produce LayerFrames,
 * remap facet-local rows to source indices, and re-export candidate helpers.
 */
import type { ColumnTable } from "../table.js";

import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";
import { buildAnnotationFrame } from "./frame-annotation.js";
import { deriveLayerGroups } from "./frame-helpers.js";
import { buildIdentityFrame } from "./frame-identity.js";
import { buildNonIdentityFrame } from "./frame-stats.js";

export { deriveLayerGroups } from "./frame-helpers.js";
export { createRawCandidateDatumResolver, candidateAutoMode } from "./frame-candidates.js";

export function buildFrame(
  binding: LayerBinding,
  table: ColumnTable,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame {
  // Annotation frames are rowless (n=0, empty inputGroups). Do not derive or
  // overwrite pre-stat groups — identity index would otherwise retain O(n)
  // source memberships for a layer with no source rows.
  if (binding.ruleForm === "annotation") {
    return buildAnnotationFrame(binding, table);
  }

  // Derive once per frame; identity index + bin lineage consume frame.inputGroups.
  const inputGroups = deriveLayerGroups(binding, table);

  const nonIdentity = buildNonIdentityFrame(
    binding,
    table,
    inputGroups,
    warnings,
    advisories,
    binRange,
  );
  if (nonIdentity !== null) return { ...nonIdentity, inputGroups };

  return { ...buildIdentityFrame(binding, table, inputGroups), inputGroups };
}

/**
 * Facet frames index into the PANEL table; hit-testing/tooltips need SOURCE
 * rows, so remap through the partition (NO_ROW stays NO_ROW).
 */
export function remapSourceRows(frame: LayerFrame, sourceRows: number[] | null): void {
  if (sourceRows === null) return;
  for (let i = 0; i < frame.rowIndex.length; i++) {
    const local = frame.rowIndex[i]!;
    if (local !== NO_ROW) frame.rowIndex[i] = sourceRows[local]!;
  }
}
