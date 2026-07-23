/**
 * Input for mapping facet panel defs into placements.
 */
import type {
  LayoutAxisPresentation,
  LayoutTheme,
  Margins,
  TickFormatter,
} from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { AxisGuidePlan } from "../layout/temporal-guide.js";

import type { FacetPanelDef } from "./facets.js";
import type { DisplayBandFn, DisplayScalesFn, DisplayTemporalFn } from "./panel-layout-types.js";

export interface MapFacetPanelPlacementsInput {
  facetPanels: readonly FacetPanelDef[];
  freeH: boolean;
  freeV: boolean;
  displayScales: DisplayScalesFn;
  displayTemporal: DisplayTemporalFn;
  displayBand: DisplayBandFn;
  mMax: Margins;
  previousGuidePlans: readonly Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[];
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>;
}
