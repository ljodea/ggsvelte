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
import { assertFacetForm, facetFreeFlags } from "./facets-form.js";
import { resolveFacetWrap } from "./facets-wrap.js";

export type { FacetPanelDef, FacetLayout } from "./facets-types.js";
export { SINGLE_PANEL } from "./facets-types.js";

export function resolveFacet(facet: FacetSpec | undefined, table: ColumnTable): FacetLayout {
  if (facet === undefined) return SINGLE_PANEL(table);
  const wrapField = facetField(facet.wrap, "wrap", table);
  const rowsField = facetField(facet.rows, "rows", table);
  const colsField = facetField(facet.cols, "cols", table);
  assertFacetForm({ wrapField, rowsField, colsField });
  const { freeX, freeY } = facetFreeFlags(facet.scales);

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
