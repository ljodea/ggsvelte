/**
 * Facet-grid panel placement: shared margins, free-scale edges, strips, packing.
 */
import type {
  BandLayoutDomainContext,
  LayoutAxisPresentation,
  LayoutTheme,
  Margins,
  PassResult,
  TemporalLayoutDomainContext,
  TickFormatter,
} from "../layout/layout.js";
import { layout, layoutPass } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { AxisGuidePlan } from "../layout/temporal-guide.js";
import { PANEL_SPACING } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { DEFAULT_FACET_STRIP, type FacetStripConfig } from "./facets-types.js";
import { isVerticalStrip } from "./facets-strip.js";
import {
  elementwiseMaxMargins,
  LEGEND_EDGE_PAD,
  LEGEND_GAP,
  layoutDomain,
} from "./layout-helpers.js";
import type { PanelLayoutChrome } from "./panel-layout-chrome.js";
import type {
  DisplayBandFn,
  DisplayScalesFn,
  DisplayTemporalFn,
  PanelPlacement,
} from "./panel-layout-types.js";
import type { RunOptions } from "./types.js";

interface FacetOuterChrome {
  spacing: number;
  strip: number;
  stripConfig: FacetStripConfig;
  outerLeft: number;
  outerBottom: number;
  outerRight: number;
  gridW: number;
  gridH: number;
  approxW: number;
  approxH: number;
}

interface FacetSharedMarginsResult {
  margins: Margins;
  previousGuidePlans: readonly Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[];
}

interface FacetCellGeometry {
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}

interface FacetGridGeometry {
  mMax: Margins;
  previousGuidePlans: readonly Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[];
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}

function computeFacetOuterChrome(input: {
  nrow: number;
  ncol: number;
  outerLeftTitle: string;
  outerBottomTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  legendBottomHeight: number;
  optionsWidth: number;
  layoutHeight: number;
  stripBand: number;
  stripConfig: FacetStripConfig;
}): FacetOuterChrome {
  const {
    nrow,
    ncol,
    outerLeftTitle,
    outerBottomTitle,
    axisTitleBand,
    legendWidth,
    legendBottomHeight,
    optionsWidth,
    layoutHeight,
    stripBand,
    stripConfig,
  } = input;

  const spacing = PANEL_SPACING;
  const outerLeft = outerLeftTitle === "" ? 0 : axisTitleBand;
  const outerBottom =
    (outerBottomTitle === "" ? 0 : axisTitleBand) +
    (legendBottomHeight > 0 ? legendBottomHeight + LEGEND_GAP + LEGEND_EDGE_PAD : 0);
  const outerRight = legendWidth > 0 ? legendWidth + LEGEND_GAP + LEGEND_EDGE_PAD : 0;
  const gridW = Math.max(40, optionsWidth - outerLeft - outerRight);
  const gridH = Math.max(40, layoutHeight - outerBottom);
  const vertical = isVerticalStrip(stripConfig.position);
  const stripH = vertical ? nrow * stripBand : 0;
  const stripW = vertical ? 0 : ncol * stripBand;
  const approxW = Math.max(40, (gridW - stripW - (ncol - 1) * spacing) / ncol);
  const approxH = Math.max(40, (gridH - stripH - (nrow - 1) * spacing) / nrow);

  return {
    spacing,
    strip: stripBand,
    stripConfig,
    outerLeft,
    outerBottom,
    outerRight,
    gridW,
    gridH,
    approxW,
    approxH,
  };
}

function computeFacetSharedMargins(input: {
  facetPanels: readonly FacetPanelDef[];
  approxW: number;
  approxH: number;
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
}): FacetSharedMarginsResult {
  const {
    facetPanels,
    approxW,
    approxH,
    displayScales,
    displayTemporal,
    displayBand,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
    axis,
  } = input;

  let mMax: Margins = { top: 0, right: 0, bottom: 0, left: 0 };
  const previousGuidePlans: Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>[] = [];
  for (let p = 0; p < facetPanels.length; p++) {
    const { h, v } = displayScales(p);
    const temporal = displayTemporal(p);
    const band = displayBand(p);
    const run = layout({
      width: approxW,
      height: approxH,
      x: layoutDomain(h, hBreaks, temporal.h, band.h),
      y: layoutDomain(v, vBreaks, temporal.v, band.v),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      measurer,
      axis,
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

export function computeFacetPanelSize(input: {
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  spacing: number;
  strip: number;
  stripConfig?: FacetStripConfig;
  gridW: number;
  gridH: number;
}): { panelW: number; panelH: number } {
  const {
    nrow,
    ncol,
    freeH,
    freeV,
    mMax,
    spacing,
    strip,
    stripConfig = DEFAULT_FACET_STRIP,
    gridW,
    gridH,
  } = input;
  const leftCount = freeV ? ncol : 1;
  const bottomCount = freeH ? nrow : 1;
  const vertical = isVerticalStrip(stripConfig.position);
  const stripW = vertical ? 0 : ncol * strip;
  const stripH = vertical ? nrow * strip : 0;
  const panelW = Math.max(
    1,
    (gridW - leftCount * mMax.left - mMax.right - stripW - (ncol - 1) * spacing) / ncol,
  );
  const panelH = Math.max(
    1,
    (gridH - mMax.top - bottomCount * mMax.bottom - stripH - (nrow - 1) * spacing) / nrow,
  );
  return { panelW, panelH };
}

function computeFacetColRowPlacements(input: {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  outerLeft: number;
  topBand: number;
  spacing: number;
  strip: number;
  stripConfig?: FacetStripConfig;
  panelW: number;
  panelH: number;
}): { colX: number[]; rowY: number[]; bottomMostRow: number[] } {
  const {
    facetPanels,
    nrow,
    ncol,
    freeH,
    freeV,
    mMax,
    outerLeft,
    topBand,
    spacing,
    strip,
    stripConfig = DEFAULT_FACET_STRIP,
    panelW,
    panelH,
  } = input;

  const colX: number[] = [];
  let xCursor = outerLeft;
  for (let c = 0; c < ncol; c++) {
    if (stripConfig.position === "left") xCursor += strip;
    if (c === 0 || freeV) xCursor += mMax.left;
    colX.push(xCursor);
    xCursor += panelW;
    if (stripConfig.position === "right") xCursor += strip;
    xCursor += spacing;
  }

  const rowY: number[] = [];
  let yCursor = topBand + mMax.top;
  for (let r = 0; r < nrow; r++) {
    if (stripConfig.position === "top") yCursor += strip;
    rowY.push(yCursor);
    yCursor += panelH;
    if (r === nrow - 1 || freeH) yCursor += mMax.bottom;
    if (stripConfig.position === "bottom") yCursor += strip;
    yCursor += spacing;
  }

  const bottomMostRow: number[] = Array.from({ length: ncol }, () => 0);
  for (const def of facetPanels) {
    if (def.row > bottomMostRow[def.col]!) bottomMostRow[def.col] = def.row;
  }

  return { colX, rowY, bottomMostRow };
}

function computeFacetCellGeometry(input: {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  outerLeft: number;
  topBand: number;
  spacing: number;
  strip: number;
  stripConfig: FacetStripConfig;
  gridW: number;
  gridH: number;
}): FacetCellGeometry {
  const { panelW, panelH } = computeFacetPanelSize(input);
  const { colX, rowY, bottomMostRow } = computeFacetColRowPlacements({
    ...input,
    panelW,
    panelH,
  });
  return { panelW, panelH, colX, rowY, bottomMostRow };
}

function hasBandPlan(shared: FacetSharedMarginsResult): boolean {
  return shared.previousGuidePlans.some(
    (g) => g.x?.scaleType === "band" || g.y?.scaleType === "band",
  );
}

function computeFacetGridGeometry(input: {
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
  stripBand: number;
  stripConfig: FacetStripConfig;
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
}): FacetGridGeometry {
  const outer = computeFacetOuterChrome({
    nrow: input.nrow,
    ncol: input.ncol,
    outerLeftTitle: input.outerLeftTitle,
    outerBottomTitle: input.outerBottomTitle,
    axisTitleBand: input.axisTitleBand,
    legendWidth: input.legendWidth,
    legendBottomHeight: input.legendBottomHeight,
    optionsWidth: input.optionsWidth,
    layoutHeight: input.layoutHeight,
    stripBand: input.stripBand,
    stripConfig: input.stripConfig,
  });

  const sharedInput = {
    facetPanels: input.facetPanels,
    displayScales: input.displayScales,
    displayTemporal: input.displayTemporal,
    displayBand: input.displayBand,
    hBreaks: input.hBreaks,
    vBreaks: input.vBreaks,
    formatH: input.formatH,
    formatV: input.formatV,
    measurer: input.measurer,
    layoutTheme: input.layoutTheme,
    axis: input.axis,
  };

  const cellInput = {
    facetPanels: input.facetPanels,
    nrow: input.nrow,
    ncol: input.ncol,
    freeH: input.freeH,
    freeV: input.freeV,
    outerLeft: outer.outerLeft,
    topBand: input.topBand,
    spacing: outer.spacing,
    strip: outer.strip,
    stripConfig: outer.stripConfig,
    gridW: outer.gridW,
    gridH: outer.gridH,
  };

  const shared = computeFacetSharedMargins({
    ...sharedInput,
    approxW: outer.approxW,
    approxH: outer.approxH,
  });
  const cells = computeFacetCellGeometry({ ...cellInput, mMax: shared.margins });

  if (hasBandPlan(shared)) {
    const shared2 = computeFacetSharedMargins({
      ...sharedInput,
      approxW: cells.panelW + shared.margins.left + shared.margins.right,
      approxH: cells.panelH + shared.margins.top + shared.margins.bottom,
    });
    const mMax = elementwiseMaxMargins(shared.margins, shared2.margins);
    const cells2 = computeFacetCellGeometry({ ...cellInput, mMax });
    return {
      mMax,
      previousGuidePlans: shared2.previousGuidePlans,
      ...cells2,
    };
  }

  return {
    mMax: shared.margins,
    previousGuidePlans: shared.previousGuidePlans,
    ...cells,
  };
}

export function packFacetPanelPlacement(input: {
  def: FacetPanelDef;
  colX: number;
  rowY: number;
  panelW: number;
  panelH: number;
  freeH: boolean;
  freeV: boolean;
  bottomMostRow: number;
  ticksRun: PassResult;
}): PanelPlacement {
  const { def, colX, rowY, panelW, panelH, freeH, freeV, bottomMostRow, ticksRun } = input;
  return {
    x: colX,
    y: rowY,
    width: panelW,
    height: panelH,
    ticksH: ticksRun.x.ticks,
    ticksV: ticksRun.y.ticks,
    ...(ticksRun.x.guidePlan !== undefined && { hGuidePlan: ticksRun.x.guidePlan }),
    ...(ticksRun.y.guidePlan !== undefined && { vGuidePlan: ticksRun.y.guidePlan }),
    showAxisX: freeH || def.row === bottomMostRow,
    showAxisY: freeV || def.col === 0,
  };
}

function placeFacetPanelFromTicks(input: {
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
  const {
    def,
    h,
    v,
    hTemporal,
    vTemporal,
    hBand,
    vBand,
    mMax,
    previousGuidePlans,
    panelW,
    panelH,
    colX,
    rowY,
    freeH,
    freeV,
    bottomMostRow,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
    axis,
  } = input;

  const ticksRun = layoutPass(
    mMax,
    {
      width: panelW + mMax.left + mMax.right,
      height: panelH + mMax.top + mMax.bottom,
      x: layoutDomain(h, hBreaks, hTemporal, hBand),
      y: layoutDomain(v, vBreaks, vTemporal, vBand),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      ...(previousGuidePlans !== undefined && { previousGuidePlans }),
      measurer,
      axis,
    },
    layoutTheme,
  );
  return packFacetPanelPlacement({
    def,
    colX,
    rowY,
    panelW,
    panelH,
    freeH,
    freeV,
    bottomMostRow,
    ticksRun,
  });
}

function mapFacetPanelPlacements(input: {
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
}): PanelPlacement[] {
  const {
    facetPanels,
    freeH,
    freeV,
    displayScales,
    displayTemporal,
    displayBand,
    mMax,
    previousGuidePlans,
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
    axis,
  } = input;

  return facetPanels.map((def, p) => {
    const { h, v } = displayScales(p);
    const temporal = displayTemporal(p);
    const band = displayBand(p);
    return placeFacetPanelFromTicks({
      def,
      h,
      v,
      ...(temporal.h !== undefined && { hTemporal: temporal.h }),
      ...(temporal.v !== undefined && { vTemporal: temporal.v }),
      ...(band.h !== undefined && { hBand: band.h }),
      ...(band.v !== undefined && { vBand: band.v }),
      mMax,
      ...(previousGuidePlans[p] !== undefined && {
        previousGuidePlans: previousGuidePlans[p],
      }),
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
      axis,
    });
  });
}

function placeFacetPanels(input: {
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
  stripBand: number;
  stripConfig: FacetStripConfig;
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
}): PanelPlacement[] {
  const geometry = computeFacetGridGeometry(input);
  return mapFacetPanelPlacements({
    facetPanels: input.facetPanels,
    freeH: input.freeH,
    freeV: input.freeV,
    displayScales: input.displayScales,
    displayTemporal: input.displayTemporal,
    displayBand: input.displayBand,
    mMax: geometry.mMax,
    previousGuidePlans: geometry.previousGuidePlans,
    panelW: geometry.panelW,
    panelH: geometry.panelH,
    colX: geometry.colX,
    rowY: geometry.rowY,
    bottomMostRow: geometry.bottomMostRow,
    hBreaks: input.hBreaks,
    vBreaks: input.vBreaks,
    formatH: input.formatH,
    formatV: input.formatV,
    measurer: input.measurer,
    layoutTheme: input.layoutTheme,
    axis: input.axis,
  });
}

export function placeFacetPanelsFromChrome(input: {
  nrow: number;
  ncol: number;
  facetPanels: readonly FacetPanelDef[];
  strip: FacetStripConfig;
  stripBand: number;
  chrome: PanelLayoutChrome;
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>;
  options: Pick<RunOptions, "width">;
}): PanelPlacement[] {
  const { nrow, ncol, facetPanels, strip, stripBand, chrome, axis, options } = input;
  return placeFacetPanels({
    facetPanels,
    nrow,
    ncol,
    freeH: chrome.freeH,
    freeV: chrome.freeV,
    outerLeftTitle: chrome.vTitle,
    outerBottomTitle: chrome.hTitle,
    axisTitleBand: chrome.axisTitleBand,
    legendWidth: chrome.legendBlock.width,
    legendBottomHeight: chrome.legendBlock.bottomHeight,
    optionsWidth: options.width,
    layoutHeight: chrome.layoutHeight,
    topBand: chrome.topBand,
    stripBand,
    stripConfig: strip,
    displayScales: chrome.displayScales,
    displayTemporal: chrome.displayTemporal,
    displayBand: chrome.displayBand,
    hBreaks: chrome.hBreaks,
    vBreaks: chrome.vBreaks,
    formatH: chrome.formatH,
    formatV: chrome.formatV,
    measurer: chrome.measurer,
    layoutTheme: chrome.layoutTheme,
    axis,
  });
}
