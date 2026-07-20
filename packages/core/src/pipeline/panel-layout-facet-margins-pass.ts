/**
 * Shared max-margins pass across facet panels (union of per-panel layout).
 */
import type { LayoutTheme, Margins, TickFormatter } from "../layout/layout.js";
import { layout } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { AxisGuidePlan } from "../layout/temporal-guide.js";

import type { FacetPanelDef } from "./facets.js";
import { elementwiseMaxMargins, layoutDomain } from "./layout-helpers.js";
import type { DisplayScalesFn, DisplayTemporalFn } from "./panel-layout-types.js";

export interface FacetSharedMarginsResult {
  margins: Margins;
  previousGuidePlans: readonly Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[];
}

export function computeFacetSharedMargins(input: {
  facetPanels: readonly FacetPanelDef[];
  approxW: number;
  approxH: number;
  displayScales: DisplayScalesFn;
  displayTemporal: DisplayTemporalFn;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
}): FacetSharedMarginsResult {
  const {
    facetPanels,
    approxW,
    approxH,
    displayScales,
    displayTemporal,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  let mMax: Margins = { top: 0, right: 0, bottom: 0, left: 0 };
  const previousGuidePlans: Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[] = [];
  for (let p = 0; p < facetPanels.length; p++) {
    const { h, v } = displayScales(p);
    const temporal = displayTemporal(p);
    const run = layout({
      width: approxW,
      height: approxH,
      x: layoutDomain(h, hBreaks, temporal.h),
      y: layoutDomain(v, vBreaks, temporal.v),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      measurer,
      theme: layoutTheme,
    });
    mMax = elementwiseMaxMargins(mMax, run.margins);
    previousGuidePlans.push(
      Object.freeze({
        ...(run.x.guidePlan !== undefined && { x: run.x.guidePlan }),
        ...(run.y.guidePlan !== undefined && { y: run.y.guidePlan }),
      }),
    );
  }
  return {
    margins: mMax,
    previousGuidePlans: Object.freeze(previousGuidePlans),
  };
}
