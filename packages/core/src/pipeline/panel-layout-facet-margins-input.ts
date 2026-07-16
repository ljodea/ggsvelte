/**
 * Input contract for facet grid geometry computation.
 */
import type { LayoutTheme, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import type { DisplayScalesFn } from "./panel-layout-types.js";

export interface FacetGridGeometryInput {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  outerLeftTitle: string;
  outerBottomTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  optionsWidth: number;
  layoutHeight: number;
  topBand: number;
  displayScales: DisplayScalesFn;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
}
