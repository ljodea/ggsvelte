/**
 * Input contract for facet grid geometry computation.
 */
import type { LayoutAxisPresentation, LayoutTheme, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import type { DisplayBandFn, DisplayScalesFn, DisplayTemporalFn } from "./panel-layout-types.js";

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
  legendBottomHeight: number;
  optionsWidth: number;
  layoutHeight: number;
  topBand: number;
  /** Measured strip band size (0 when hidden). */
  stripBand: number;
  stripConfig: import("./facets-types.js").FacetStripConfig;
  displayScales: DisplayScalesFn;
  displayTemporal: DisplayTemporalFn;
  displayBand: DisplayBandFn;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>;
}
