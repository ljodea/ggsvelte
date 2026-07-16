/**
 * Facet grid geometry result (margins + cell placement).
 */
import type { Margins } from "../layout/layout.js";

export interface FacetGridGeometry {
  mMax: Margins;
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}
