/**
 * Layer-frame construction: run per-panel stats to produce LayerFrames,
 * remap facet-local rows to source indices, and re-export candidate helpers.
 */
import type { ColumnTable } from "../table.js";

import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { buildAnnotationFrame } from "./frame-annotation.js";
import { expandEdgeFrame } from "./frame-edge-expand.js";
import { deriveLayerGroups } from "./frame-helpers.js";
import { buildIdentityFrame } from "./frame-identity.js";
import { buildMapFrame } from "./frame-stats-map.js";
import { buildSfFrame } from "./frame-stats-sf.js";
import { buildNonIdentityFrame } from "./frame-stats.js";

export { deriveLayerGroups } from "./frame-helpers.js";

export function buildFrame(
  binding: LayerBinding,
  table: ColumnTable,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
  datasets?: import("@ggsvelte/spec").PortableSpec["datasets"],
): LayerFrame {
  // Annotation frames are rowless (n=0, empty inputGroups). Do not derive or
  // overwrite pre-stat groups — identity index would otherwise retain O(n)
  // source memberships for a layer with no source rows.
  if (binding.ruleForm === "annotation") {
    return buildAnnotationFrame(binding, table);
  }

  // Derive once per frame; identity index + bin lineage consume frame.inputGroups.
  const inputGroups = deriveLayerGroups(binding, table);

  if (binding.layer.geom === "map") {
    return { ...buildMapFrame(binding, table, inputGroups, warnings, datasets), inputGroups };
  }
  if (binding.layer.geom === "sf") {
    return { ...buildSfFrame(binding, table, inputGroups, warnings), inputGroups };
  }

  const nonIdentity = buildNonIdentityFrame(
    binding,
    table,
    inputGroups,
    warnings,
    advisories,
    binRange,
  );
  if (nonIdentity !== null) return { ...nonIdentity, inputGroups };

  const frame = { ...buildIdentityFrame(binding, table, inputGroups), inputGroups };
  expandEdgeFrame(frame, warnings);
  return frame;
}
