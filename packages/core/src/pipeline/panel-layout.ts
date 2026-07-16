/**
 * Two-pass panel layout: facet grids and single-panel plots, including
 * axis-title/legend chrome and free-scale edge axes.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { FONT_METRICS } from "../layout/font-metrics.js";
import type { LayoutResult, Margins, PassResult, TickFormatter } from "../layout/layout.js";
import { DEFAULT_LAYOUT_THEME, layout, layoutPass } from "../layout/layout.js";
import { MetricsTableMeasurer } from "../layout/measure.js";
import type { LegendInput, LegendOrder } from "../legend.js";
import { buildLegends } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import { PANEL_SPACING, STRIP_BAND } from "../scene.js";
import type { ThemeTokens } from "../theme.js";

import type { FacetPanelDef } from "./facets.js";
import {
  AXIS_TITLE_BAND,
  CAPTION_BAND,
  LEGEND_EDGE_PAD,
  LEGEND_GAP,
  SUBTITLE_BAND,
  TITLE_BAND,
  elementwiseMaxMargins,
  layoutDomain,
  makeAxisFormatter,
} from "./layout-helpers.js";
import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export interface PanelPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  ticksH: LayoutResult["x"]["ticks"];
  ticksV: LayoutResult["y"]["ticks"];
  showAxisX: boolean;
  showAxisY: boolean;
}

export interface PanelLayoutResult {
  placements: PanelPlacement[];
  title: string;
  subtitle: string;
  caption: string;
  hTitle: string;
  vTitle: string;
  xTitle: string;
  yTitle: string;
  topBand: number;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  legendBlock: ReturnType<typeof buildLegends>;
}

export function computePanelLayout(input: {
  flip: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  facetPanels: readonly FacetPanelDef[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  allFrames: readonly LayerFrame[];
  labs: NonNullable<PortableSpec["labs"]>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  colorLegend: LegendInput | null;
  fillLegend: LegendInput | null;
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  options: Pick<RunOptions, "width" | "height" | "measureText">;
  warnings: PipelineWarning[];
}): PanelLayoutResult {
  const {
    flip,
    faceted,
    freeX,
    freeY,
    nrow,
    ncol,
    facetPanels,
    panelScales,
    allFrames,
    labs,
    scalesConfig,
    xScale,
    yScale,
    theme,
    options,
    warnings,
  } = input;

  const title = labs.title ?? "";
  const subtitle = labs.subtitle ?? "";
  const caption = labs.caption ?? "";
  const xTitle = labs.x ?? allFrames.find((f) => f.binding.xField !== null)?.binding.xField ?? "";
  const yTitle =
    labs.y ??
    allFrames.find((f) => f.binding.yField !== null)?.binding.yField ??
    allFrames.find((f) => f.binding.yStatColumn !== null)?.binding.yStatColumn ??
    "";
  const titleBand = Math.max(TITLE_BAND, theme.titleSize + 7);
  const subtitleBand = Math.max(SUBTITLE_BAND, theme.subtitleSize + 4);
  const captionBand = Math.max(CAPTION_BAND, theme.captionSize + 5);
  const axisTitleBand = Math.max(AXIS_TITLE_BAND, theme.axisTitleSize + 9);
  const topBand = (title === "" ? 0 : titleBand) + (subtitle === "" ? 0 : subtitleBand);
  const bottomBand = caption === "" ? 0 : captionBand;

  const hTitle = flip ? yTitle : xTitle;
  const vTitle = flip ? xTitle : yTitle;
  const formatX = makeAxisFormatter("x", xScale, scalesConfig.x, warnings);
  const formatY = makeAxisFormatter("y", yScale, scalesConfig.y, warnings);
  const formatH = flip ? formatY : formatX;
  const formatV = flip ? formatX : formatY;
  const hBreaks = flip ? scalesConfig.y?.breaks : scalesConfig.x?.breaks;
  const vBreaks = flip ? scalesConfig.x?.breaks : scalesConfig.y?.breaks;
  const freeH = flip ? freeY : freeX;
  const freeV = flip ? freeX : freeY;
  const displayScales = (p: number): { h: PositionScale; v: PositionScale } => {
    const s = panelScales[p]!;
    return flip ? { h: s.y, v: s.x } : { h: s.x, v: s.y };
  };

  const measurer = options.measureText ?? new MetricsTableMeasurer(FONT_METRICS);
  const layoutTheme = {
    ...DEFAULT_LAYOUT_THEME,
    fontSize: theme.axisTextSize,
    tickLength: theme.ticksX || theme.ticksY ? theme.tickLength : 0,
    tickLabelGap: theme.ticksX || theme.ticksY ? 3 : 5,
  };
  const legendInputs = [input.colorLegend, input.fillLegend].filter(
    (l): l is LegendInput => l !== null,
  );
  const legendBlock = buildLegends(
    legendInputs,
    input.legendOrder,
    measurer,
    Math.max(48, options.width * 0.35),
  );

  const layoutHeight = Math.max(40, options.height - topBand - bottomBand);
  const placements: PanelPlacement[] = [];

  if (faceted) {
    const spacing = PANEL_SPACING;
    const strip = STRIP_BAND;
    const outerLeft = vTitle === "" ? 0 : axisTitleBand;
    const outerBottom = hTitle === "" ? 0 : axisTitleBand;
    const outerRight = legendBlock.width > 0 ? legendBlock.width + LEGEND_GAP + LEGEND_EDGE_PAD : 0;
    const gridW = Math.max(40, options.width - outerLeft - outerRight);
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
  } else {
    const { h, v } = displayScales(0);
    const reserve: Partial<Margins> = {
      ...(hTitle !== "" && { bottom: axisTitleBand }),
      ...(vTitle !== "" && { left: axisTitleBand }),
      ...(legendBlock.width > 0 && { right: legendBlock.width + LEGEND_GAP + LEGEND_EDGE_PAD }),
    };
    const layoutResult = layout({
      width: options.width,
      height: layoutHeight,
      x: layoutDomain(h, hBreaks),
      y: layoutDomain(v, vBreaks),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      measurer,
      reserve,
      theme: layoutTheme,
    });
    const margins = layoutResult.margins;
    placements.push({
      x: margins.left,
      y: topBand + margins.top,
      width: Math.max(1, options.width - margins.left - margins.right),
      height: Math.max(1, layoutHeight - margins.top - margins.bottom),
      ticksH: layoutResult.x.ticks,
      ticksV: layoutResult.y.ticks,
      showAxisX: true,
      showAxisY: true,
    });
  }

  return {
    placements,
    title,
    subtitle,
    caption,
    hTitle,
    vTitle,
    xTitle,
    yTitle,
    topBand,
    formatX,
    formatY,
    displayScales,
    legendBlock,
  };
}
