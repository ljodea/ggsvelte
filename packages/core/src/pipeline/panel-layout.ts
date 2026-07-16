/**
 * Two-pass panel layout: facet grids and single-panel plots, including
 * axis-title/legend chrome and free-scale edge axes.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { FONT_METRICS } from "../layout/font-metrics.js";
import { DEFAULT_LAYOUT_THEME } from "../layout/layout.js";
import { MetricsTableMeasurer } from "../layout/measure.js";
import type { LegendInput, LegendOrder } from "../legend.js";
import { buildLegends } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import type { FacetPanelDef } from "./facets.js";
import {
  AXIS_TITLE_BAND,
  CAPTION_BAND,
  SUBTITLE_BAND,
  TITLE_BAND,
  makeAxisFormatter,
} from "./layout-helpers.js";
import { placeFacetPanels } from "./panel-layout-facet.js";
import { placeSinglePanel } from "./panel-layout-single.js";
import type { PanelLayoutResult, PanelPlacement } from "./panel-layout-types.js";
import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export type { PanelPlacement, PanelLayoutResult } from "./panel-layout-types.js";

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
  let placements: PanelPlacement[];

  if (faceted) {
    placements = placeFacetPanels({
      facetPanels,
      nrow,
      ncol,
      freeH,
      freeV,
      outerLeftTitle: vTitle,
      outerBottomTitle: hTitle,
      axisTitleBand,
      legendWidth: legendBlock.width,
      optionsWidth: options.width,
      layoutHeight,
      topBand,
      displayScales,
      hBreaks,
      vBreaks,
      formatH,
      formatV,
      measurer,
      layoutTheme,
    });
  } else {
    const { h, v } = displayScales(0);
    placements = [
      placeSinglePanel({
        h,
        v,
        hTitle,
        vTitle,
        axisTitleBand,
        legendWidth: legendBlock.width,
        optionsWidth: options.width,
        layoutHeight,
        topBand,
        hBreaks,
        vBreaks,
        formatH,
        formatV,
        measurer,
        layoutTheme,
      }),
    ];
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
