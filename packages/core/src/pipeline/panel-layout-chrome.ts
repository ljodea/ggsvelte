/**
 * Panel layout chrome: labs, axis titles (with coord flip), formatters, legends.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { FONT_METRICS } from "../layout/font-metrics.js";
import type { LayoutTheme, TickFormatter } from "../layout/layout.js";
import { DEFAULT_LAYOUT_THEME } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import { MetricsTableMeasurer } from "../layout/measure.js";
import type { LegendInput, LegendOrder } from "../legend.js";
import { buildLegends } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import {
  AXIS_TITLE_BAND,
  CAPTION_BAND,
  SUBTITLE_BAND,
  TITLE_BAND,
  makeAxisFormatter,
} from "./layout-helpers.js";
import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export interface PanelLayoutChrome {
  title: string;
  subtitle: string;
  caption: string;
  xTitle: string;
  yTitle: string;
  hTitle: string;
  vTitle: string;
  topBand: number;
  bottomBand: number;
  axisTitleBand: number;
  layoutHeight: number;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  freeH: boolean;
  freeV: boolean;
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  legendBlock: ReturnType<typeof buildLegends>;
}

export function resolvePanelLayoutChrome(input: {
  flip: boolean;
  freeX: boolean;
  freeY: boolean;
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
}): PanelLayoutChrome {
  const {
    flip,
    freeX,
    freeY,
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

  return {
    title,
    subtitle,
    caption,
    xTitle,
    yTitle,
    hTitle,
    vTitle,
    topBand,
    bottomBand,
    axisTitleBand,
    layoutHeight,
    formatX,
    formatY,
    formatH,
    formatV,
    hBreaks,
    vBreaks,
    freeH,
    freeV,
    displayScales,
    measurer,
    layoutTheme,
    legendBlock,
  };
}
