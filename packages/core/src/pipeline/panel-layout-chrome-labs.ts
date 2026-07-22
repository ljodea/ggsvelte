/**
 * Panel chrome labs, axis titles, and reserved title/caption bands.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { ThemeTokens } from "../theme.js";

import { AXIS_TITLE_BAND, CAPTION_BAND, SUBTITLE_BAND, TITLE_BAND } from "./layout-helpers.js";
import type { LayerFrame } from "./types.js";

export interface PanelLayoutLabs {
  title: string;
  subtitle: string;
  caption: string;
  xTitle: string;
  yTitle: string;
  topBand: number;
  bottomBand: number;
  axisTitleBand: number;
}

export function resolvePanelLayoutLabs(input: {
  allFrames: readonly LayerFrame[];
  labs: NonNullable<PortableSpec["labs"]>;
  theme: ThemeTokens;
  axisTitleSize: number;
  height: number;
}): PanelLayoutLabs & { layoutHeight: number } {
  const { allFrames, labs, theme, axisTitleSize, height } = input;

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
  const axisTitleBand = Math.max(AXIS_TITLE_BAND, axisTitleSize + 9);
  const topBand = (title === "" ? 0 : titleBand) + (subtitle === "" ? 0 : subtitleBand);
  const bottomBand = caption === "" ? 0 : captionBand;
  const layoutHeight = Math.max(40, height - topBand - bottomBand);

  return {
    title,
    subtitle,
    caption,
    xTitle,
    yTitle,
    topBand,
    bottomBand,
    axisTitleBand,
    layoutHeight,
  };
}
