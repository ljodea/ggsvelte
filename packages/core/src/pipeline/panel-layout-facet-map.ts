/**
 * Map facet panel defs through geometry into placements.
 */
import { placeOneFacetPanel } from "./panel-layout-facet-place-one.js";
import type { MapFacetPanelPlacementsInput } from "./panel-layout-facet-map-input.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export type { MapFacetPanelPlacementsInput } from "./panel-layout-facet-map-input.js";

export function mapFacetPanelPlacements(input: MapFacetPanelPlacementsInput): PanelPlacement[] {
  const {
    facetPanels,
    freeH,
    freeV,
    displayScales,
    displayTemporal,
    mMax,
    panelW,
    panelH,
    colX,
    rowY,
    bottomMostRow,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  return facetPanels.map((def, p) => {
    const { h, v } = displayScales(p);
    const temporal = displayTemporal(p);
    return placeOneFacetPanel({
      def,
      h,
      v,
      ...(temporal.h !== undefined && { hTemporal: temporal.h }),
      ...(temporal.v !== undefined && { vTemporal: temporal.v }),
      mMax,
      panelW,
      panelH,
      colX: colX[def.col]!,
      rowY: rowY[def.row]!,
      freeH,
      freeV,
      bottomMostRow: bottomMostRow[def.col]!,
      hBreaks,
      vBreaks,
      formatH,
      formatV,
      measurer,
      layoutTheme,
    });
  });
}
