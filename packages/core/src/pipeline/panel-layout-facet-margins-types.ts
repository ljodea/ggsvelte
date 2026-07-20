/**
 * Facet grid geometry result (margins + cell placement).
 */
import type { Margins } from "../layout/layout.js";
import type { AxisGuidePlan } from "../layout/temporal-guide.js";

export interface FacetGridGeometry {
  mMax: Margins;
  previousGuidePlans: readonly Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[];
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}
