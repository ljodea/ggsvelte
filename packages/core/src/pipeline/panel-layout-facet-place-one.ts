/**
 * Place one facet panel: tick layout pass + axis visibility flags.
 */
import type {
  BandLayoutDomainContext,
  LayoutAxisPresentation,
  LayoutTheme,
  Margins,
  TemporalLayoutDomainContext,
  TickFormatter,
} from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { AxisGuidePlan } from "../layout/temporal-guide.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { placeFacetPanelFromTicks } from "./panel-layout-facet-place-ticks.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export function placeOneFacetPanel(input: {
  def: FacetPanelDef;
  h: PositionScale;
  v: PositionScale;
  hTemporal?: TemporalLayoutDomainContext;
  vTemporal?: TemporalLayoutDomainContext;
  hBand?: BandLayoutDomainContext;
  vBand?: BandLayoutDomainContext;
  mMax: Margins;
  previousGuidePlans?: Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>;
  panelW: number;
  panelH: number;
  colX: number;
  rowY: number;
  freeH: boolean;
  freeV: boolean;
  bottomMostRow: number;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>;
}): PanelPlacement {
  return placeFacetPanelFromTicks(input);
}
