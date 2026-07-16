/**
 * Facet partition (BEFORE stats/positions — plan round-2 consensus).
 * Counts, bins, stacks, and dodges are panel-local, exactly like ggplot2.
 */
import type { FacetSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { facetField } from "./facets-helpers.js";
import { resolveFacetGrid } from "./facets-grid.js";
import type { FacetLayout } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";
import { resolveFacetWrap } from "./facets-wrap.js";
import { PipelineError } from "./types.js";

export type { FacetPanelDef, FacetLayout } from "./facets-types.js";
export { SINGLE_PANEL } from "./facets-types.js";

export function resolveFacet(facet: FacetSpec | undefined, table: ColumnTable): FacetLayout {
  if (facet === undefined) return SINGLE_PANEL(table);
  const wrapField = facetField(facet.wrap, "wrap", table);
  const rowsField = facetField(facet.rows, "rows", table);
  const colsField = facetField(facet.cols, "cols", table);
  if (wrapField !== null && (rowsField !== null || colsField !== null)) {
    throw new PipelineError(
      "facet-form-ambiguous",
      "/facet",
      "This facet mixes the wrap form (facet.wrap) with the grid form (facet.rows/facet.cols). Use wrap OR rows/cols, never both.",
    );
  }
  if (wrapField === null && rowsField === null && colsField === null) {
    throw new PipelineError(
      "facet-form-missing",
      "/facet",
      "This facet sets neither wrap nor rows/cols — there is no field to partition panels by.",
    );
  }
  const scales = facet.scales ?? "fixed";
  const freeX = scales === "free" || scales === "free_x";
  const freeY = scales === "free" || scales === "free_y";

  if (wrapField !== null) {
    return resolveFacetWrap({
      table,
      wrapField,
      ncol: facet.ncol,
      freeX,
      freeY,
    });
  }

  return resolveFacetGrid({
    table,
    rowsField,
    colsField,
    freeX,
    freeY,
  });
}
