/**
 * Facet-grid panel placement: shared margins, free-scale edges, strips, packing.
 *
 * - panel-layout-facet-geometry.ts — panel size + grid geometry
 * - panel-layout-facet-place.ts — pack placements + chrome entrypoint
 */
export { computeFacetPanelSize } from "./panel-layout-facet-geometry.js";
export { packFacetPanelPlacement, placeFacetPanelsFromChrome } from "./panel-layout-facet-place.js";
