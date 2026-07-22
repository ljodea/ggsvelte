/**
 * Facet grid: outer chrome, shared margin pass, and panel cell geometry.
 */
import { elementwiseMaxMargins } from "./layout-helpers.js";
import { computeFacetCellGeometry } from "./panel-layout-facet-cells.js";
import type { FacetGridGeometryInput } from "./panel-layout-facet-margins-input.js";
import {
  computeFacetSharedMargins,
  type FacetSharedMarginsResult,
} from "./panel-layout-facet-margins-pass.js";
import type { FacetGridGeometry } from "./panel-layout-facet-margins-types.js";
import { computeFacetOuterChrome } from "./panel-layout-facet-outer.js";

export type { FacetGridGeometry } from "./panel-layout-facet-margins-types.js";
export type { FacetGridGeometryInput } from "./panel-layout-facet-margins-input.js";

/** Does any panel carry a measured band (categorical) axis guide plan? */
function hasBandPlan(shared: FacetSharedMarginsResult): boolean {
  return shared.previousGuidePlans.some(
    (g) => g.x?.scaleType === "band" || g.y?.scaleType === "band",
  );
}

export function computeFacetGridGeometry(input: FacetGridGeometryInput): FacetGridGeometry {
  const outer = computeFacetOuterChrome({
    nrow: input.nrow,
    ncol: input.ncol,
    outerLeftTitle: input.outerLeftTitle,
    outerBottomTitle: input.outerBottomTitle,
    axisTitleBand: input.axisTitleBand,
    legendWidth: input.legendWidth,
    legendBottomHeight: input.legendBottomHeight,
    optionsWidth: input.optionsWidth,
    layoutHeight: input.layoutHeight,
  });

  const sharedInput = {
    facetPanels: input.facetPanels,
    displayScales: input.displayScales,
    displayTemporal: input.displayTemporal,
    displayBand: input.displayBand,
    hBreaks: input.hBreaks,
    vBreaks: input.vBreaks,
    formatH: input.formatH,
    formatV: input.formatV,
    measurer: input.measurer,
    layoutTheme: input.layoutTheme,
  };

  const cellInput = {
    facetPanels: input.facetPanels,
    nrow: input.nrow,
    ncol: input.ncol,
    freeH: input.freeH,
    freeV: input.freeV,
    outerLeft: outer.outerLeft,
    topBand: input.topBand,
    spacing: outer.spacing,
    strip: outer.strip,
    gridW: outer.gridW,
    gridH: outer.gridH,
  };

  const shared = computeFacetSharedMargins({
    ...sharedInput,
    approxW: outer.approxW,
    approxH: outer.approxH,
  });
  const cells = computeFacetCellGeometry({ ...cellInput, mMax: shared.margins });

  // Band axes measure taller wrapped/rotated label bands at the NARROWER final
  // panel width than at the optimistic `approxW`. Re-plan once at the derived
  // panel size and reserve the (monotonically larger) margin, so bottom-row
  // labels / the x title never draw into adjacent chrome. Gated to band facets so
  // temporal/continuous facets keep their exact single-pass geometry.
  if (hasBandPlan(shared)) {
    // `computeFacetSharedMargins` treats approxW/H as the per-panel layout BOX
    // (layout() subtracts margins to get the inner plot size), exactly as final
    // placement does with `panelW + mMax.left + mMax.right`. Pass the total cell
    // box — NOT `cells.panelW`, which is already the inner width and would make
    // layout() subtract margins twice and over-escalate the labels.
    const shared2 = computeFacetSharedMargins({
      ...sharedInput,
      approxW: cells.panelW + shared.margins.left + shared.margins.right,
      approxH: cells.panelH + shared.margins.top + shared.margins.bottom,
    });
    const mMax = elementwiseMaxMargins(shared.margins, shared2.margins);
    const cells2 = computeFacetCellGeometry({ ...cellInput, mMax });
    return {
      mMax,
      previousGuidePlans: shared2.previousGuidePlans,
      ...cells2,
    };
  }

  return {
    mMax: shared.margins,
    previousGuidePlans: shared.previousGuidePlans,
    ...cells,
  };
}
