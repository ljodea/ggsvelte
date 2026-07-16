/**
 * Facet-grid panel placement: shared margin pass, free-scale edge axes, strips.
 */
import type { LayoutTheme, Margins, PassResult, TickFormatter } from "../layout/layout.js";
import { layout, layoutPass } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import { PANEL_SPACING, STRIP_BAND } from "../scene.js";

import type { FacetPanelDef } from "./facets.js";
import {
  LEGEND_EDGE_PAD,
  LEGEND_GAP,
  elementwiseMaxMargins,
  layoutDomain,
} from "./layout-helpers.js";
import type { DisplayScalesFn, PanelPlacement } from "./panel-layout-types.js";

export function placeFacetPanels(input: {
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
}): PanelPlacement[] {
  const {
    facetPanels,
    nrow,
    ncol,
    freeH,
    freeV,
    outerLeftTitle,
    outerBottomTitle,
    axisTitleBand,
    legendWidth,
    optionsWidth,
    layoutHeight,
    topBand,
    displayScales,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  const spacing = PANEL_SPACING;
  const strip = STRIP_BAND;
  const outerLeft = outerLeftTitle === "" ? 0 : axisTitleBand;
  const outerBottom = outerBottomTitle === "" ? 0 : axisTitleBand;
  const outerRight = legendWidth > 0 ? legendWidth + LEGEND_GAP + LEGEND_EDGE_PAD : 0;
  const gridW = Math.max(40, optionsWidth - outerLeft - outerRight);
  const gridH = Math.max(40, layoutHeight - outerBottom);

  const approxW = Math.max(40, (gridW - (ncol - 1) * spacing) / ncol);
  const approxH = Math.max(40, (gridH - nrow * strip - (nrow - 1) * spacing) / nrow);
  let mMax: Margins = { top: 0, right: 0, bottom: 0, left: 0 };
  for (let p = 0; p < facetPanels.length; p++) {
    const { h, v } = displayScales(p);
    const run = layout({
      width: approxW,
      height: approxH,
      x: layoutDomain(h, hBreaks),
      y: layoutDomain(v, vBreaks),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      measurer,
      theme: layoutTheme,
    });
    mMax = elementwiseMaxMargins(mMax, run.margins);
  }

  const leftCount = freeV ? ncol : 1;
  const bottomCount = freeH ? nrow : 1;
  const panelW = Math.max(
    1,
    (gridW - leftCount * mMax.left - mMax.right - (ncol - 1) * spacing) / ncol,
  );
  const panelH = Math.max(
    1,
    (gridH - mMax.top - bottomCount * mMax.bottom - nrow * strip - (nrow - 1) * spacing) / nrow,
  );

  const colX: number[] = [];
  let xCursor = outerLeft;
  for (let c = 0; c < ncol; c++) {
    if (c === 0 || freeV) xCursor += mMax.left;
    colX.push(xCursor);
    xCursor += panelW + spacing;
  }
  const rowY: number[] = [];
  let yCursor = topBand + mMax.top;
  for (let r = 0; r < nrow; r++) {
    yCursor += strip;
    rowY.push(yCursor);
    yCursor += panelH;
    if (r === nrow - 1 || freeH) yCursor += mMax.bottom;
    yCursor += spacing;
  }

  const bottomMostRow: number[] = Array.from({ length: ncol }, () => 0);
  for (const def of facetPanels) {
    if (def.row > bottomMostRow[def.col]!) bottomMostRow[def.col] = def.row;
  }

  const placements: PanelPlacement[] = [];
  for (let p = 0; p < facetPanels.length; p++) {
    const def = facetPanels[p]!;
    const { h, v } = displayScales(p);
    const ticksRun: PassResult = layoutPass(
      mMax,
      {
        width: panelW + mMax.left + mMax.right,
        height: panelH + mMax.top + mMax.bottom,
        x: layoutDomain(h, hBreaks),
        y: layoutDomain(v, vBreaks),
        ...(formatH !== undefined && { formatX: formatH }),
        ...(formatV !== undefined && { formatY: formatV }),
        measurer,
      },
      layoutTheme,
    );
    placements.push({
      x: colX[def.col]!,
      y: rowY[def.row]!,
      width: panelW,
      height: panelH,
      ticksH: ticksRun.x.ticks,
      ticksV: ticksRun.y.ticks,
      showAxisX: freeH || def.row === bottomMostRow[def.col]!,
      showAxisY: freeV || def.col === 0,
    });
  }
  return placements;
}
