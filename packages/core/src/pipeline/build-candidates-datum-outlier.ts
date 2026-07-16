/**
 * Boxplot outlier row context for identity candidates.
 */
import type { GeometryBatch } from "../scene.js";

import type { FacetPanelDef } from "./facets.js";
import type { LayerFrame } from "./types.js";

export function resolveOutlierContext(input: {
  frame: LayerFrame | undefined;
  batch: GeometryBatch;
  primitiveIndex: number;
  facetPanel: FacetPanelDef | undefined;
}): { outlierLocalRow: number | null; outlierSourceRow: number | null } {
  const { frame, batch, primitiveIndex, facetPanel } = input;
  const outlierLocalRow =
    frame?.box !== null && frame?.binding.layer.geom === "boxplot" && batch.kind === "points"
      ? (frame?.box.outlierRow[primitiveIndex] ?? null)
      : null;
  const outlierSourceRow =
    outlierLocalRow === null
      ? null
      : (facetPanel?.sourceRows?.[outlierLocalRow] ?? outlierLocalRow);
  return { outlierLocalRow, outlierSourceRow };
}
